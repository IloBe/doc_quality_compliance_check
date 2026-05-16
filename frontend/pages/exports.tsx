import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { LuFilter } from 'react-icons/lu';
import { getHeaderControlClass } from '../components/buttonStyles';
import ExportDownloadDialog from '../components/exportsRegistry/ExportDownloadDialog';
import ExportsRegistryFiltersPanel from '../components/exportsRegistry/ExportsRegistryFiltersPanel';
import ExportsRegistryKpiGrid from '../components/exportsRegistry/ExportsRegistryKpiGrid';
import ExportsRegistryTable from '../components/exportsRegistry/ExportsRegistryTable';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { useMockStore, ExportJob } from '../lib/mockStore';
import { downloadExportToBrowser, uploadExportToRemote } from '../lib/exportRegistryClient';
import {
  DownloadDestination,
  ExportStatusFilter,
  ExportTypeFilter,
  buildExportRegistryStats,
  filterExports,
} from '../lib/exportRegistryViewModel';
import { syncQueryParam } from '../lib/queryState';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function resolveDestination(value: string): DownloadDestination {
  if (value === 'local' || value === 'remote') {
    return value;
  }
  return null;
}

const ExportsRegistryPage = () => {
  const router = useRouter();
  const exports = useMockStore((state) => state.exports);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<ExportStatusFilter>('All');
  const [typeFilter, setTypeFilter] = useState<ExportTypeFilter>('All');
  const [isDownloading, setIsDownloading] = useState(false);
  const [remoteServerUrl, setRemoteServerUrl] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filteredExports = useMemo(
    () => filterExports(exports, statusFilter, typeFilter),
    [exports, statusFilter, typeFilter],
  );

  const stats = useMemo(() => buildExportRegistryStats(exports), [exports]);

  const downloadDialogExport = useMemo<ExportJob | null>(() => {
    const selectedExportId = readQueryValue(router.query.export);
    if (!selectedExportId) {
      return null;
    }
    return exports.find((item) => item.id === selectedExportId) ?? null;
  }, [exports, router.query.export]);

  const selectedDestination = useMemo<DownloadDestination>(() => {
    return resolveDestination(readQueryValue(router.query.destination));
  }, [router.query.destination]);

  useEffect(() => {
    syncQueryParam(router, 'export', downloadDialogExport?.id ?? '');
  }, [downloadDialogExport?.id, router]);

  useEffect(() => {
    const desiredDestination = downloadDialogExport ? (selectedDestination ?? '') : '';
    syncQueryParam(router, 'destination', desiredDestination);
  }, [downloadDialogExport, router, selectedDestination]);

  const commitDownloadSelection = useCallback((nextExportId: string | null, nextDestination: DownloadDestination) => {
    if (!router.isReady) {
      return;
    }

    const currentExportId = readQueryValue(router.query.export);
    const currentDestination = resolveDestination(readQueryValue(router.query.destination));
    const desiredExportId = nextExportId ?? '';
    const desiredDestination = nextDestination ?? null;

    if (currentExportId === desiredExportId && currentDestination === desiredDestination) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'export' || key === 'destination') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    if (desiredExportId) {
      nextQuery.export = desiredExportId;
    }
    if (desiredExportId && desiredDestination) {
      nextQuery.destination = desiredDestination;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [router]);

  const resetDownloadState = useCallback(() => {
    commitDownloadSelection(null, null);
    setRemoteServerUrl('');
    setDownloadError(null);
  }, [commitDownloadSelection]);

  const handleDownloadClick = useCallback((exportJob: ExportJob) => {
    commitDownloadSelection(exportJob.id, null);
    setRemoteServerUrl('');
    setDownloadError(null);
  }, [commitDownloadSelection]);

  const handleLocalDownload = useCallback(async () => {
    if (!downloadDialogExport) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadExportToBrowser(downloadDialogExport);
      resetDownloadState();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred during download';
      setDownloadError(errorMsg);
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [downloadDialogExport, resetDownloadState]);

  const handleRemoteDownload = useCallback(async () => {
    if (!downloadDialogExport || !remoteServerUrl.trim()) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      await uploadExportToRemote({ exportJob: downloadDialogExport, remoteServerUrl });
      resetDownloadState();
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : 'Failed to upload to remote server. Please try again.';
      setDownloadError(errorMsg);
      console.error('Remote upload error:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [downloadDialogExport, remoteServerUrl, resetDownloadState]);

  const scrollToFilters = useCallback(() => {
    filtersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Operations & Compliance"
        title="Exports Registry"
        subtitle="Organization-wide view of all document export jobs and their status."
        whyDescription="The Exports Registry provides a centralized, read-only record of all document exports across the organization. This visibility is essential for audit trails, ensuring all exports (PDFs, Excel files, etc.) are traceable, timestamped, and linked to their source documents. It supports compliance requirements for document provenance and helps stakeholders track export queue status and completion."
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToFilters}
              className={getHeaderControlClass('neutral')}
            >
              <LuFilter className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>
        }
      />

      <ExportsRegistryKpiGrid stats={stats} />

      <div ref={filtersRef}>
        <ExportsRegistryFiltersPanel
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          totalCount={exports.length}
          filteredCount={filteredExports.length}
          onStatusFilterChange={setStatusFilter}
          onTypeFilterChange={setTypeFilter}
        />
      </div>

      <ExportsRegistryTable
        exports={filteredExports}
        selectedExportId={downloadDialogExport?.id ?? null}
        onDownload={handleDownloadClick}
      />

      <FooterInfoCard title="Governance note" accent="blue">
        This is a read-only exports registry showing all past and present export jobs. Status filters help locate exports by processing state. For per-document export management, visit the specific document&apos;s Exports tab.
      </FooterInfoCard>

      <ExportDownloadDialog
        exportJob={downloadDialogExport}
        selectedDestination={selectedDestination}
        remoteServerUrl={remoteServerUrl}
        downloadError={downloadError}
        isDownloading={isDownloading}
        onClose={resetDownloadState}
        onSelectDestination={(destination) => commitDownloadSelection(downloadDialogExport?.id ?? null, destination)}
        onRemoteServerUrlChange={setRemoteServerUrl}
        onBack={() => {
          commitDownloadSelection(downloadDialogExport?.id ?? null, null);
          setDownloadError(null);
        }}
        onLocalDownload={handleLocalDownload}
        onRemoteUpload={handleRemoteDownload}
      />
    </div>
  );
};

export default ExportsRegistryPage;

