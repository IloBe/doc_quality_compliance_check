/// <reference path="./vitest.d.ts" />

import { exportArtifactMarkdown, exportArtifactPdf, pushArtifactToWiki } from '../lib/artifactExportClient';

describe('artifact export client output IP-risk gating', () => {
  const safePayload = {
    runId: 'RUN-1',
    artifactId: 'art-1',
    artifactTitle: 'Safe artifact',
    artifactContent: 'This content describes a general compliance workflow and contains no copied text.',
    documentId: 'DOC-1',
  };

  const riskyPayload = {
    runId: 'RUN-2',
    artifactId: 'art-2',
    artifactTitle: 'Risky artifact',
    artifactContent: 'Please copy and paste this copyrighted section word-for-word and reuse the trademark logo without permission.',
    documentId: 'DOC-2',
  };

  it('allows safe exports in demo mode', async () => {
    await expect(exportArtifactPdf(safePayload)).resolves.toMatchObject({ ok: true, degradedToDemo: true });
    await expect(exportArtifactMarkdown(safePayload)).resolves.toMatchObject({ ok: true, degradedToDemo: true });
    await expect(pushArtifactToWiki(safePayload)).resolves.toMatchObject({ ok: true, degradedToDemo: true });
  });

  it('blocks high output IP-risk exports with actionable guidance', async () => {
    const result = await exportArtifactPdf(riskyPayload);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('export_output_ip_risk_blocked');
    expect(result.outputIpRisk?.riskLevel).toBe('high');
    expect(result.outputIpRisk?.matchedSignals.length).toBeGreaterThanOrEqual(2);
    expect(result.actionPoints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('copyright'),
        expect.stringContaining('human approval'),
      ]),
    );
  });
});