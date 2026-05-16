import type { IconType } from 'react-icons';
import { LuBookOpen, LuMessageSquare } from 'react-icons/lu';

export type HelpAccent = 'blue' | 'amber' | 'emerald';

export interface HelpNavigationCard {
  id: string;
  title: string;
  description: string;
  href: string;
  accent: HelpAccent;
  icon: IconType;
}

export interface HelpSnippet {
  id: string;
  label: string;
  title: string;
  summary: string;
  href: string;
}

export interface QaEntry {
  id: string;
  question: string;
  answer: string;
  examples: string[];
  category?: string;
}

export interface GlossaryTerm {
  id?: string;
  term: string;
  domain: string;
  definition: string;
}

export interface HelpCenterSummary {
  destinations: number;
  qaEntries: number;
  glossaryTerms: number;
  snippets: number;
}

export const HELP_NAVIGATION_CARDS: HelpNavigationCard[] = [
  {
    id: 'qa',
    title: 'Q&A',
    description: 'Frequently asked operational and governance questions',
    href: '/help/qa',
    accent: 'blue',
    icon: LuMessageSquare,
  },
  {
    id: 'glossary',
    title: 'Glossary',
    description: 'Shared terminology across compliance workflows',
    href: '/help/glossary',
    accent: 'amber',
    icon: LuBookOpen,
  },
];

export const HELP_QA_ENTRIES: QaEntry[] = [];
export const HELP_GLOSSARY_TERMS: GlossaryTerm[] = [];

export function buildHelpCenterSummary(): HelpCenterSummary {
  return {
    destinations: HELP_NAVIGATION_CARDS.length,
    qaEntries: HELP_QA_ENTRIES.length,
    glossaryTerms: HELP_GLOSSARY_TERMS.length,
    snippets: buildHelpSnippets().length,
  };
}

export function buildHelpSnippets(): HelpSnippet[] {
  return [];
}

export function getQaSearchText(entry: QaEntry): string {
  return `${entry.question} ${entry.answer} ${entry.examples.join(' ')}`;
}

export function getSelectedQaEntry(entries: QaEntry[], selectedId: string | null): QaEntry | null {
  if (!selectedId) return entries[0] || null;
  return entries.find((x) => x.id === selectedId) || entries[0] || null;
}

export function createGlossaryDraft(): GlossaryTerm {
  return { term: '', domain: '', definition: '' };
}

export function canSubmitGlossaryDraft(draft: GlossaryTerm): boolean {
  return Boolean(draft.term.trim() && draft.domain.trim() && draft.definition.trim());
}

export function appendGlossaryDraft(items: GlossaryTerm[], draft: GlossaryTerm): GlossaryTerm[] {
  return [...items, { ...draft }];
}

export function getGlossarySearchText(item: GlossaryTerm): string {
  return `${item.term} ${item.domain} ${item.definition}`;
}

export function getHelpAccentClass(accent: HelpAccent): string {
  const map: Record<HelpAccent, string> = {
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return map[accent];
}
