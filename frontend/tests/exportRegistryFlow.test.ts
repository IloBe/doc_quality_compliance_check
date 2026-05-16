/// <reference path="./vitest.d.ts" />

import {
  buildExportFilename,
  buildExportRegistryStats,
  filterExports,
  formatExportDuration,
  type ExportStatusFilter,
  type ExportTypeFilter,
} from '../lib/exportRegistryViewModel';

describe('exports registry flow helpers', () => {
  const rows = [
    { id: 'e1', status: 'Ready', type: 'PDF', name: 'alpha' },
    { id: 'e2', status: 'Failed', type: 'Markdown', name: 'beta' },
    { id: 'e3', status: 'Processing', type: 'Bundle', name: 'gamma' },
    { id: 'e4', status: 'Running', type: 'PDF', name: 'delta' },
    { id: 'e5', status: 'Queued', type: 'PDF', name: 'epsilon' },
  ];

  it('filters by status/type combinations used in registry panels', () => {
    const readyPdf = filterExports(rows, 'Ready' as ExportStatusFilter, 'PDF' as ExportTypeFilter);
    const allPdf = filterExports(rows, 'All' as ExportStatusFilter, 'PDF' as ExportTypeFilter);

    expect(readyPdf.map((x) => x.id)).toEqual(['e1']);
    expect(allPdf.map((x) => x.id)).toEqual(['e1', 'e4', 'e5']);
  });

  it('computes summary stats including running and queued buckets', () => {
    const stats = buildExportRegistryStats(rows);

    expect(stats.total).toBe(5);
    expect(stats.ready).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.processing).toBe(1);
    expect(stats.running).toBe(1);
    expect(stats.queued).toBe(1);
  });

  it('formats export filenames and durations deterministically', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);

    expect(buildExportFilename('custom')).toBe('custom-1234567890.zip');
    expect(buildExportFilename({ name: 'from-name' })).toBe('from-name-1234567890.zip');
    expect(buildExportFilename({ docTitle: 'from-doc' })).toBe('from-doc-1234567890.zip');

    expect(formatExportDuration('2026-05-01T00:00:00.000Z', '2026-05-01T00:00:09.000Z')).toBe('9s');
    expect(formatExportDuration(undefined, '2026-05-01T00:00:09.000Z')).toBe('—');
  });
});
