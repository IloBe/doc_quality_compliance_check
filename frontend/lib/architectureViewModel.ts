export interface Arc42Item {
  id: string;
  fileName: string;
  title: string;
  version?: string;
  status?: string;
  html: string;
}

function cleanupArc42Value(value: string): string {
  const noBr = value.replace(/<br\s*\/?\s*>/gi, ' ').trim();
  const collapsed = noBr.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  // Treat pure underline placeholders as empty metadata.
  if (/^_+$/.test(collapsed)) return '';
  return collapsed;
}

export function parseArc42Field(markdown: string, field: string): string | undefined {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`^\\*\\*${escapedField}:\\*\\*\\s*(.+)$`, 'im'),
    new RegExp(`^${escapedField}\\s*:\\s*(.+)$`, 'im'),
  ];

  for (const pattern of patterns) {
    const matched = pattern.exec(markdown)?.[1];
    if (matched == null) continue;
    const cleaned = cleanupArc42Value(matched);
    if (cleaned) return cleaned;
  }

  return undefined;
}

export function parseArc42Title(markdown: string, fallbackTitle: string): string {
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim();
  return heading || fallbackTitle;
}

export function resolveActiveArc42Template(templates: Arc42Item[], id?: string): Arc42Item | undefined {
  if (!templates.length) return undefined;
  if (!id) return templates[0];
  return templates.find((t) => t.id === id) || templates[0];
}

export function buildArc42MetaLine(item: Arc42Item): string {
  return [item.version ? `v${item.version}` : '', item.status || ''].filter(Boolean).join(' | ');
}
