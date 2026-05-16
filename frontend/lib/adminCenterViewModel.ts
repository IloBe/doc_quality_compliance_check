// Admin Center ViewModel - Stub implementation
// Provides data models and utilities for the Admin Center dashboard

import { LuActivity, LuShield, LuUsers } from 'react-icons/lu';

export interface AdminCenterSummary {
  domains: number;
  observabilitySignals: number;
  stakeholderProfiles: number;
}

export interface AdminNavigationCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'blue' | 'amber' | 'red';
}

export const ADMIN_NAVIGATION_CARDS: AdminNavigationCard[] = [
  {
    id: 'observability',
    title: 'Observability',
    description: 'Monitor system health signals and KPIs',
    href: '/admin/observability',
    icon: LuActivity,
    accent: 'blue',
  },
  {
    id: 'stakeholders',
    title: 'Stakeholders & Rights',
    description: 'Manage role profiles and access assignments',
    href: '/admin/stakeholders',
    icon: LuUsers,
    accent: 'amber',
  },
  {
    id: 'governance',
    title: 'Governance',
    description: 'Configure compliance policies and controls',
    href: '/admin/governance',
    icon: LuShield,
    accent: 'red',
  },
];

export function buildAdminCenterSummary(): AdminCenterSummary {
  return {
    domains: 12,
    observabilitySignals: 47,
    stakeholderProfiles: 8,
  };
}

export function getAdminAccentClass(accent: 'blue' | 'amber' | 'red'): string {
  const accentClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return accentClasses[accent] || accentClasses.blue;
}
