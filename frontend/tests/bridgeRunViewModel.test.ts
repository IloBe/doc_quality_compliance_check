/// <reference path="./vitest.d.ts" />

import {
  buildQualityGateSummary,
  deriveFindingGroups,
  deriveMitigationItems,
  derivePrivacyMitigationItems,
  deriveRunControlItems,
  deriveAutomaticRecommendation,
  inferBridgeDomainInfo,
  mapBridgeFailureGuidance,
} from '../lib/bridgeRunViewModel';
import { BridgeApiError } from '../lib/bridgeClient';

describe('bridgeRunViewModel inferBridgeDomainInfo', () => {
  it('returns backend-compatible payload with required fields', () => {
    const payload = inferBridgeDomainInfo({
      title: '07_bridge_gdpr_security_violation_xray_complaint.pdf',
      type: 'risk_assessment',
    });

    expect(payload.domain).toBe('medical devices');
    expect(payload.description).toMatch(/Bridge workflow evaluation/i);
    expect(payload.uses_ai_ml).toBe(true);
    expect(payload.intended_use).toBe('compliance and risk verification');
    expect(payload.target_market).toBe('EU');
  });

  it('falls back to quality management domain for generic docs', () => {
    const payload = inferBridgeDomainInfo({
      title: 'sop.md',
      type: 'sop',
    });

    expect(payload.domain).toBe('quality management');
    expect(payload.description.length).toBeGreaterThan(10);
  });

  it('reports rejected quality gate summary when privacy violation is detected', () => {
    const summary = buildQualityGateSummary({
      backendRun: {
        mandatory_gaps: [],
        optional_gaps: [],
        privacy_violation: {
          detected: true,
          matched_signals: ['privacy_violation_claim'],
        },
      },
      complianceChecks: [{ name: 'GDPR / privacy violation signals detected', passed: false }],
      researchChecks: [{ name: 'Privacy risk signal review', passed: false }],
    });

    expect(summary.heading).toMatch(/Rejected/i);
    expect(summary.text).toMatch(/Privacy violation: yes/i);
  });

  it('uses automatic recommendation when provided by backend', () => {
    const recommendation = deriveAutomaticRecommendation([], [], {
      automatic_recommendation: 'rejected',
      approved: true,
    });

    expect(recommendation).toBe('rejected');
  });

  it('derives applicable control items with context activation for medical runs', () => {
    const controls = deriveRunControlItems({
      checked_frameworks: ['gdpr', 'mdr_eu_medical_devices', 'iso_13485'],
      requirements_catalog: [
        { framework: 'gdpr', mandatory: true },
        { framework: 'mdr_eu_medical_devices', mandatory: true },
        { framework: 'iso_13485', mandatory: true },
      ],
      requirements: [
        { framework: 'gdpr', passed: false, title: 'Security of processing' },
        { framework: 'mdr_eu_medical_devices', passed: false, title: 'Clinical evaluation' },
        { framework: 'iso_13485', passed: true, title: 'QMS evidence' },
      ],
    });

    expect(controls.map((item) => item.label)).toEqual(expect.arrayContaining(['GDPR', 'ISO/IEC 13485']));
    expect(controls.find((item) => item.frameworkId === 'iso_13485')?.activationType).toBe('context');
  });

  it('prefers backend governance controls when provided', () => {
    const controls = deriveRunControlItems({
      checked_frameworks: ['gdpr'],
      governance_controls: [
        {
          id: 'ctrl-1',
          framework: 'GDPR Art. 32',
          framework_id: 'gdpr',
          activation_mode: 'baseline',
          status: 'critical',
        },
      ],
      requirements: [
        { framework: 'gdpr', passed: true, title: 'security of processing' },
      ],
    });

    expect(controls).toHaveLength(1);
    expect(controls[0].label).toBe('GDPR Art. 32');
    expect(controls[0].status).toBe('failed');
  });

  it('groups failed findings by framework with citation details', () => {
    const groups = deriveFindingGroups({
      requirements: [
        {
          framework: 'gdpr',
          requirement_id: 'GDPR-ART-32',
          title: 'Security of processing',
          passed: false,
          gap_description: 'Security of processing: Define technical/organizational security controls for personal data (GDPR Art. 32).',
        },
      ],
      privacy_violation: {
        detected: true,
        matched_signals: ['privacy_violation_claim'],
      },
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('GDPR');
    expect(groups[0].findings[0].articleOrClause).toMatch(/GDPR Art\. 5|GDPR Art\. 32|Art\. 32/i);
  });

  it('builds mitigation items from failed requirements before privacy proposals', () => {
    const items = deriveMitigationItems({
      privacy_violation: {
        detected: true,
        matched_signals: ['privacy_violation_claim'],
        proposals: [
          {
            title: 'Apply deterministic PHI/PII redaction before model invocation',
            details: 'Mask names and identifiers before any model step.',
          },
        ],
      },
      requirements: [
        {
          framework: 'gdpr',
          title: 'Security of processing',
          passed: false,
          gap_description: 'Add technical and organizational controls for personal data.',
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0].topic).toMatch(/Corrective action plan/i);
    expect(items[0].proposal).toMatch(/owner, due date, and verification evidence/i);
  });

  it('prefers backend mitigation recommendations over requirement echo output', () => {
    const items = deriveMitigationItems({
      mitigation_recommendations: [
        {
          topic: 'Close data-protection control gaps',
          proposal: 'Implement deterministic redaction with verification evidence before rerun.',
        },
      ],
      requirements: [
        {
          framework: 'gdpr',
          title: 'Security of processing',
          passed: false,
          gap_description: 'Security of processing controls missing.',
        },
      ],
    });

    expect(items).toEqual([
      {
        topic: 'Close data-protection control gaps',
        proposal: 'Implement deterministic redaction with verification evidence before rerun.',
      },
    ]);
  });

  it('uses actionable fallback wording for failed requirements', () => {
    const items = deriveMitigationItems({
      requirements: [
        {
          framework: 'iso_27001',
          title: 'Access control policy',
          passed: false,
          gap_description: 'Missing least privilege role matrix.',
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0].topic).toMatch(/Corrective action plan/i);
    expect(items[0].proposal).toMatch(/owner, due date, and verification evidence/i);
  });

  it('does not mix privacy proposals into control mitigation list', () => {
    const items = deriveMitigationItems({
      privacy_violation: {
        detected: true,
        proposals: [
          {
            title: 'Apply deterministic PHI/PII redaction before model invocation',
            details: 'Mask names and identifiers before any model step.',
          },
        ],
      },
      requirements: [],
      mitigation_recommendations: [],
    });

    expect(items).toHaveLength(0);
  });

  it('derives dedicated privacy mitigation items for quality-gate recommendation step', () => {
    const items = derivePrivacyMitigationItems({
      privacy_violation: {
        detected: true,
        proposals: [
          {
            title: 'Apply deterministic PHI/PII redaction before model invocation',
            details: 'Mask names and identifiers before any model step.',
            implementation_status: 'implemented',
            implementation_note: 'Implemented in runtime guardrails.',
          },
        ],
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0].topic).toMatch(/redaction/i);
    expect(items[0].implementationStatus).toBe('implemented');
    expect(items[0].implementationNote).toMatch(/runtime guardrails/i);
  });

  it('maps fail-closed routing deny errors to actionable frontend guidance', () => {
    const guidance = mapBridgeFailureGuidance(
      new BridgeApiError({
        status: 422,
        code: 'validation_error',
        errorCode: 'validation_error',
        reason: 'bridge_policy_routing_denied',
        message: 'Bridge fail-closed routing denied this workflow run.',
        details: [],
        actionPoints: [
          'Set active model provider to on-prem ollama.',
        ],
        correlationId: 'corr-psc-routing',
      }),
    );

    expect(guidance.title).toMatch(/fail-closed routing/i);
    expect(guidance.reasonCode).toBe('bridge_policy_routing_denied');
    expect(guidance.actionPoints).toEqual(
      expect.arrayContaining(['Set active model provider to on-prem ollama.']),
    );
    expect(guidance.correlationId).toBe('corr-psc-routing');
  });

  it('maps policy contract validation errors to actionable frontend guidance', () => {
    const guidance = mapBridgeFailureGuidance(
      new BridgeApiError({
        status: 422,
        code: 'validation_error',
        errorCode: 'validation_error',
        reason: 'bridge_step_policy_invalid',
        message: 'Bridge step policy contract validation failed.',
        details: [],
        actionPoints: [],
        correlationId: 'corr-psc-contract',
      }),
    );

    expect(guidance.title).toMatch(/policy contract/i);
    expect(guidance.reasonCode).toBe('bridge_step_policy_invalid');
    expect(guidance.actionPoints.length).toBeGreaterThan(0);
  });
});
