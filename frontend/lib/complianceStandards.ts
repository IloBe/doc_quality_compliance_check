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
  privacy: { label: 'Privacy', order: 2, description: 'Privacy regulations and data protection frameworks.' },
  security: { label: 'Security', order: 3, description: 'Security standards and threat management.' },
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

const standards: ComplianceStandard[] = [
  {
    id: 'iso-27001',
    title: 'ISO 27001',
    description: 'Information security controls baseline',
    desc: 'Information security controls baseline',
    category: 'security',
    tone: 'blue',
    status: 'active',
    url: 'https://example.com/iso-27001',
    verificationHref: '/compliance/request-standard-mapping',
    verificationLabel: 'Open verification route',
    verificationRule: 'Route to verification workflow',
    verificationReason: 'Required to confirm control mapping',
  },
];

export function getGroupedStandards(): {
  alwaysOn: ComplianceStandard[];
  conditionalByCategory: Record<string, ComplianceStandard[]>;
} {
  return {
    alwaysOn: standards,
    conditionalByCategory: {},
  };
}
