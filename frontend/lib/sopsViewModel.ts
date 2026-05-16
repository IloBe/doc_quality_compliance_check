export interface SopItem {
  id: string;
  fileName: string;
  title: string;
  documentId: string;
  html: string;
}

export function parseSopDocumentId(markdown: string): string {
  const match = markdown.match(/Document\s*ID\s*:\s*([^\n]+)/i);
  return match?.[1]?.trim() || '';
}

export function parseSopTitle(markdown: string, fallbackTitle: string): string {
  return /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() || fallbackTitle;
}

export function resolveActiveSop(items: SopItem[], id?: string): SopItem | undefined {
  if (!items.length) return undefined;
  if (!id) return items[0];
  return items.find((i) => i.id === id) || items[0];
}
