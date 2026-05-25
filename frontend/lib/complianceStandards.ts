// Compliance Standards - Standard definitions and configurations

export type ComplianceTone = 'blue' | 'amber' | 'emerald' | 'rose';

export interface ComplianceStandard {
  id: string;
  title: string;
  description?: string;
  desc: string;
  category: string;
  tone: ComplianceTone;
  status: string;
  url: string;
  secondaryUrl?: string;
  verificationHref: string;
  verificationLabel: string;
  verificationRule: string;
  verificationReason: string;
}

export interface ComplianceAlert {
  id: string;
  title?: string;
  description?: string;
  text: string;
  meta: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tone: ComplianceTone;
  framework?: string;
  isDemo?: boolean;
  sourceLabel?: string;
  sourceUrl?: string;
  href?: string;
}

export interface ComplianceAlertsInfo {
  total: number;
  unresolved: number;
  summary: string;
  costNoteTitle?: string;
  costNote?: string;
}

export interface ComplianceShortcut {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
}

const toneClassMap: Record<ComplianceTone, { icon: string; badge: string; alertIcon: string }> = {
  blue: {
    icon: 'bg-blue-50 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    alertIcon: 'text-blue-600',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    alertIcon: 'text-amber-600',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    alertIcon: 'text-emerald-600',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-700',
    badge: 'bg-rose-100 text-rose-700',
    alertIcon: 'text-rose-600',
  },
};

export function toneClasses(tone: ComplianceTone): { icon: string; badge: string; alertIcon: string } {
  return toneClassMap[tone];
}

export const categoryMetadata: Record<string, { label: string; order: number; description?: string }> = {
  baseline: { label: 'Always On', order: 1, description: 'Baseline governance applied across all product domains and business contexts.' },
  optional: { label: 'Optional', order: 2, description: 'Frameworks enabled for specific operational or contractual contexts.' },
  medicine: { label: 'Medicine', order: 3, description: 'Standards activated for medical device, clinical, and healthcare software delivery contexts.' },
};

export const complianceAlerts: ComplianceAlert[] = [];

export const complianceAlertsInfo: ComplianceAlertsInfo = {
  total: 0,
  unresolved: 0,
  summary: 'No active alerts.',
  costNoteTitle: 'Cost note',
  costNote: 'No additional cost impact.',
};

export const complianceShortcuts: ComplianceShortcut[] = [];

export const complianceAlertArchive: ComplianceAlert[] = [];

type ComplianceStandardSeed = {
  id: string;
  title: string;
  description: string;
  category: string;
  tone: ComplianceTone;
  status: string;
  url: string;
  secondaryUrl?: string;
  verificationRule: string;
  verificationReason: string;
};

function createComplianceStandard(seed: ComplianceStandardSeed): ComplianceStandard {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    desc: seed.description,
    category: seed.category,
    tone: seed.tone,
    status: seed.status,
    url: seed.url,
    secondaryUrl: seed.secondaryUrl,
    verificationHref: '/compliance/request-standard-mapping',
    verificationLabel: `Open verification route for ${seed.title}`,
    verificationRule: seed.verificationRule,
    verificationReason: seed.verificationReason,
  };
}

const alwaysOnStandards: ComplianceStandard[] = [
  createComplianceStandard({
    id: 'eu-ai-act',
    title: 'EU AI Act',
    description: 'Primary regulatory baseline for AI system classification, obligations, and conformity expectations in the EU market.',
    category: 'baseline',
    tone: 'blue',
    status: 'mandatory',
    url: 'https://aiactinfo.eu/',
    secondaryUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng',
    verificationRule: 'Always include AI Act control mapping for AI-enabled product features and supporting workflows.',
    verificationReason: 'The PRD and SAD position the EU AI Act as the primary framework driving product governance and downstream control activation.',
  }),
  createComplianceStandard({
    id: 'iso-9001',
    title: 'ISO/IEC 9001',
    description: 'Quality management system baseline for documented processes, traceability, and continuous improvement.',
    category: 'baseline',
    tone: 'emerald',
    status: 'mandatory',
    url: 'https://www.iso.org/standard/62085.html',
    verificationRule: 'Route artifacts through quality management evidence checks and approval traceability validation.',
    verificationReason: 'Quality governance is a mandatory platform concern and must remain visible for audits and release readiness.',
  }),
  createComplianceStandard({
    id: 'iso-27001-2022',
    title: 'ISO/IEC 27001:2022',
    description: 'Information security management baseline for controls, asset protection, and risk-driven safeguard verification.',
    category: 'baseline',
    tone: 'blue',
    status: 'mandatory',
    url: 'https://www.iso.org/standard/27001',
    verificationRule: 'Route security-relevant documentation through control mapping and evidence completeness checks.',
    verificationReason: 'Security controls remain part of the always-on governance baseline for all regulated documentation workflows.',
  }),
  createComplianceStandard({
    id: 'iso-31000',
    title: 'ISO 31000',
    description: 'Risk management framework for identifying, evaluating, and treating operational and product-level risks.',
    category: 'baseline',
    tone: 'amber',
    status: 'mandatory',
    url: 'https://www.iso.org/standard/65694.html',
    verificationRule: 'Route findings into risk identification and mitigation evidence checks when obligations or controls change.',
    verificationReason: 'Risk treatment and governance traceability are required across the platform, independent of market segment.',
  }),
  createComplianceStandard({
    id: 'gdpr',
    title: 'GDPR',
    description: 'Data protection and privacy obligations for personal data handling, lawful basis, and subject rights.',
    category: 'baseline',
    tone: 'rose',
    status: 'mandatory',
    url: 'https://gdpr-info.eu/',
    verificationRule: 'Route personal-data handling workflows through privacy checks, lawful basis validation, and retention control review.',
    verificationReason: 'The platform processes regulated documentation and user data, so GDPR remains part of the default compliance baseline.',
  }),
  createComplianceStandard({
    id: 'nis2',
    title: 'NIS2',
    description: 'Cybersecurity and resilience obligations for essential and important entities operating in the EU.',
    category: 'baseline',
    tone: 'amber',
    status: 'mandatory',
    url: 'https://eur-lex.europa.eu/eli/dir/2022/2555/oj',
    verificationRule: 'Route service resilience, incident readiness, and governance evidence through operational security review paths.',
    verificationReason: 'NIS2 extends governance expectations beyond policy text into operational readiness and accountability.',
  }),
  createComplianceStandard({
    id: 'iso-42010',
    title: 'ISO/IEC 42010',
    description: 'Architecture description standard for stakeholder concerns, viewpoints, and traceable system documentation.',
    category: 'baseline',
    tone: 'emerald',
    status: 'mandatory',
    url: 'https://www.iso.org/standard/74393.html',
    verificationRule: 'Route architecture artifacts through viewpoint completeness and stakeholder concern coverage checks.',
    verificationReason: 'The SAD requires traceable architecture descriptions, making this standard part of the always-on documentation baseline.',
  }),
];

const conditionalStandardsByCategory: Record<string, ComplianceStandard[]> = {
  optional: [
    createComplianceStandard({
      id: 'hipaa',
      title: 'HIPAA',
      description: 'Healthcare privacy and security obligations activated for protected health information and US healthcare operations.',
      category: 'optional',
      tone: 'rose',
      status: 'conditional',
      url: 'https://www.hhs.gov/hipaa/for-professionals/index.html',
      verificationRule: 'Activate HIPAA mapping when workflows handle PHI or integrate with covered entities and business associates.',
      verificationReason: 'HIPAA is not always applicable, but must be enabled immediately when healthcare data processing enters scope.',
    }),
  ],
  medicine: [
    createComplianceStandard({
      id: 'iso-13485',
      title: 'ISO/IEC 13485',
      description: 'Medical device quality management standard for controlled development, validation, and lifecycle evidence.',
      category: 'medicine',
      tone: 'emerald',
      status: 'conditional',
      url: 'https://www.iso.org/iso-13485-medical-devices.html',
      verificationRule: 'Activate for medical-device delivery contexts requiring controlled QMS evidence and design history traceability.',
      verificationReason: 'Medical device programs need additional QMS rigor beyond the core baseline when the product domain is clinical or device-related.',
    }),
    createComplianceStandard({
      id: 'iso-14971',
      title: 'ISO/IEC 14971',
      description: 'Medical device risk management standard for hazard analysis, residual risk evaluation, and safety evidence.',
      category: 'medicine',
      tone: 'amber',
      status: 'conditional',
      url: 'https://www.iso.org/standard/72704.html',
      verificationRule: 'Activate when the product scope requires clinical safety risk analysis and residual-risk documentation.',
      verificationReason: 'Medical safety assessment demands a dedicated risk framework beyond the general-purpose ISO 31000 baseline.',
    }),
    createComplianceStandard({
      id: 'iso-62304',
      title: 'ISO/IEC 62304',
      description: 'Medical device software lifecycle process standard for development, maintenance, and release controls.',
      category: 'medicine',
      tone: 'blue',
      status: 'conditional',
      url: 'https://www.iso.org/standard/38421.html',
      verificationRule: 'Activate when software lifecycle evidence must satisfy medical software development and maintenance expectations.',
      verificationReason: 'Clinical and device software delivery requires lifecycle evidence that is stricter than the generic engineering baseline.',
    }),
  ],
};

export function getGroupedStandards(): {
  alwaysOn: ComplianceStandard[];
  conditionalByCategory: Record<string, ComplianceStandard[]>;
} {
  return {
    alwaysOn: alwaysOnStandards,
    conditionalByCategory: conditionalStandardsByCategory,
  };
}
