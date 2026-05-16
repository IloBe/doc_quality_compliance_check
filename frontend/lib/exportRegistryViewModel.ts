export interface ExportRegistryStats {
  total: number;
  ready: number;
  failed: number;
  processing: number;
  running: number;
  queued: number;
}

export type ExportStatusFilter = 'All' | 'Ready' | 'Failed' | 'Processing';
export type ExportTypeFilter = 'All' | 'PDF' | 'Markdown' | 'Bundle';
export type DownloadDestination = 'local' | 'remote' | null;

export const EXPORT_STATUS_OPTIONS: ExportStatusFilter[] = ['All', 'Ready', 'Processing', 'Failed'];
export const EXPORT_TYPE_OPTIONS: ExportTypeFilter[] = ['All', 'PDF', 'Markdown', 'Bundle'];

export function buildExportFilename(job: any): string {
  const base = typeof job === 'string' ? job : job?.name || job?.docTitle || job?.id || 'export';
  return `${base}-${Date.now()}.zip`;
}

export function filterExports(items: any[], status: ExportStatusFilter, type: ExportTypeFilter): any[] {
  return (items || []).filter((item) => {
    const statusMatch = status === 'All' || item.status === status;
    const typeMatch = type === 'All' || item.type === type;
    return statusMatch && typeMatch;
  });
}

export function buildExportRegistryStats(items: any[]): ExportRegistryStats {
  const list = items || [];
  return {
    total: list.length,
    ready: list.filter((x) => x.status === 'Ready').length,
    failed: list.filter((x) => x.status === 'Failed').length,
    processing: list.filter((x) => x.status === 'Processing').length,
    running: list.filter((x) => x.status === 'Running').length,
    queued: list.filter((x) => x.status === 'Queued').length,
  };
}

export function getExportStatusDotClass(status: string): string {
  if (status === 'Ready') return 'w-2 h-2 rounded-full bg-emerald-500';
  if (status === 'Failed') return 'w-2 h-2 rounded-full bg-rose-500';
  return 'w-2 h-2 rounded-full bg-amber-500';
}

export function getExportStatusBadgeClass(status: string): string {
  if (status === 'Ready') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700';
  if (status === 'Failed') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700';
  return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700';
}

export function getSourceStatusBadgeClass(_status?: string): string {
  return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700';
}

export function formatExportTimestamp(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatExportDuration(start?: string, end?: string): string {
  if (!start || !end) return '—';
  const deltaMs = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  return `${Math.round(deltaMs / 1000)}s`;
}
