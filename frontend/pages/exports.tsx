import React, { useMemo, useState } from 'react';
import {
  LuChevronDown,
  LuClock3,
  LuDownload,
  LuFileText,
  LuFilter,
  LuX,
  LuHardDrive,
  LuCloud,
  LuLoader,
} from 'react-icons/lu';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import { useMockStore, ExportJob } from '../lib/mockStore';

type ExportStatus = 'Queued' | 'Running' | 'Ready' | 'Failed';
type ExportType = 'PDF' | 'Excel';
type DownloadDestination = 'local' | 'remote' | null;

const ExportsRegistryPage = () => {
  const exports = useMockStore((state) => state.exports);
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<ExportType | 'All'>('All');
  const [downloadDialogExport, setDownloadDialogExport] = useState<ExportJob | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<DownloadDestination>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [remoteServerUrl, setRemoteServerUrl] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filteredExports = useMemo(() => {
    return exports.filter((exp) => {
      const statusMatch = statusFilter === 'All' || exp.status === statusFilter;
      const typeMatch = typeFilter === 'All' || exp.type === typeFilter;
      return statusMatch && typeMatch;
    });
  }, [exports, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: exports.length,
      ready: exports.filter((e) => e.status === 'Ready').length,
      running: exports.filter((e) => e.status === 'Running').length,
      queued: exports.filter((e) => e.status === 'Queued').length,
      failed: exports.filter((e) => e.status === 'Failed').length,
    };
  }, [exports]);

  const getStatusBadge = (status: ExportStatus) => {
    const baseClasses = 'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide';
    switch (status) {
      case 'Ready':
        return `${baseClasses} bg-emerald-100 text-emerald-700`;
      case 'Running':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'Queued':
        return `${baseClasses} bg-amber-100 text-amber-700`;
      case 'Failed':
        return `${baseClasses} bg-rose-100 text-rose-700`;
      default:
        return `${baseClasses} bg-neutral-100 text-neutral-700`;
    }
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'Running':
        return <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />;
      case 'Ready':
        return <div className="w-3 h-3 rounded-full bg-emerald-500" />;
      case 'Failed':
        return <div className="w-3 h-3 rounded-full bg-rose-500" />;
      default:
        return <div className="w-3 h-3 rounded-full bg-amber-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return dateStr;
  };

  const formatDuration = (createdAt: string, completedAt?: string): string => {
    if (!completedAt) {
      return '—';
    }
    if (completedAt === 'Just now') {
      return '~2s';
    }
    // For demo purposes, return simple format
    return '~2s';
  };

  const handleDownloadClick = (exp: ExportJob) => {
    setDownloadDialogExport(exp);
    setSelectedDestination(null);
    setRemoteServerUrl('');
    setDownloadError(null);
  };

  const handleLocalDownload = async () => {
    if (!downloadDialogExport) return;
    
    setIsDownloading(true);
    setDownloadError(null);
    try {
      // Simulate fetching file from backend
      const filename = `${downloadDialogExport.docTitle.replace(/\s+/g, '_')}_${downloadDialogExport.id}.${downloadDialogExport.type.toLowerCase()}`;
      
      // Create a mock blob (in production, this would be the actual file from the backend)
      const mockContent = `This is a mock ${downloadDialogExport.type} export of "${downloadDialogExport.docTitle}"\n\nExport ID: ${downloadDialogExport.id}\nStatus: ${downloadDialogExport.status}\nCreated: ${downloadDialogExport.createdAt}`;
      const blob = new Blob([mockContent], {
        type: downloadDialogExport.type === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Verify blob was created successfully
      if (!blob || blob.size === 0) {
        throw new Error('Failed to prepare file for download. File is empty or corrupted.');
      }

      // Trigger browser's native save dialog
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      
      // Verify link was added to DOM
      if (!document.body.contains(link)) {
        throw new Error('System error: Cannot initiate download. Please try again.');
      }

      link.click();
      
      // Small delay to ensure click is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Close dialog on success
      setDownloadDialogExport(null);
      setSelectedDestination(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred during download';
      setDownloadError(errorMsg);
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoteDownload = async () => {
    if (!downloadDialogExport || !remoteServerUrl.trim()) return;

    setIsDownloading(true);
    setDownloadError(null);
    try {
      // Validate URL format
      try {
        new URL(remoteServerUrl);
      } catch {
        throw new Error('Invalid server URL. Please enter a valid URL (e.g., https://example.com/upload)');
      }

      // In production, this would POST to your backend which handles remote storage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch('/api/exports/upload-to-remote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exportId: downloadDialogExport.id,
            remoteUrl: remoteServerUrl,
            filename: `${downloadDialogExport.docTitle.replace(/\s+/g, '_')}_${downloadDialogExport.id}.${downloadDialogExport.type.toLowerCase()}`
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || 
            `Server error (${response.status}): ${response.statusText}. Please check the remote server and try again.`
          );
        }

        // Success
        setDownloadDialogExport(null);
        setSelectedDestination(null);
        setRemoteServerUrl('');
      } catch (fetchError) {
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network error: Cannot reach the backend server. Please check your internet connection and try again.');
        }
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Upload timeout: The operation took too long. The remote server may be unresponsive or the file too large. Please try again.');
        }
        throw fetchError;
      }
    } catch (error) {
      const errorMsg = error instanceof Error 
        ? error.message 
        : 'Failed to upload to remote server. Please try again.';
      setDownloadError(errorMsg);
      console.error('Remote upload error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

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
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition shadow-sm"
            >
              <LuFilter className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Total Exports
            </span>
            <LuFileText className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{stats.total}</div>
          <div className="text-xs text-neutral-500 mt-1">All time</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Ready
            </span>
            <div className="w-4 h-4 rounded-full bg-emerald-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{stats.ready}</div>
          <div className="text-xs text-neutral-500 mt-1">Available for download</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Running
            </span>
            <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{stats.running}</div>
          <div className="text-xs text-neutral-500 mt-1">In progress</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Queued
            </span>
            <div className="w-4 h-4 rounded-full bg-amber-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{stats.queued}</div>
          <div className="text-xs text-neutral-500 mt-1">Awaiting processing</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Failed
            </span>
            <div className="w-4 h-4 rounded-full bg-rose-500" />
          </div>
          <div className="text-3xl font-black text-neutral-900">{stats.failed}</div>
          <div className="text-xs text-neutral-500 mt-1">Retry or review</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ExportStatus | 'All')}
              className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Ready">Ready</option>
              <option value="Running">Running</option>
              <option value="Queued">Queued</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ExportType | 'All')}
              className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 rounded-lg bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="PDF">PDF</option>
              <option value="Excel">Excel</option>
            </select>
          </div>

          <div className="ml-auto text-xs font-semibold text-neutral-500">
            Showing {filteredExports.length} of {exports.length}
          </div>
        </div>
      </div>

      {/* Exports Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-neutral-400 border-b border-neutral-100 bg-neutral-50">
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Export Job</th>
                <th className="py-3 px-5">Source Document</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5">Source Status</th>
                <th className="py-3 px-5">Created</th>
                <th className="py-3 px-5">Completed</th>
                <th className="py-3 px-5">Duration</th>
                <th className="py-3 px-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExports.length > 0 ? (
                filteredExports.map((exp) => (
                  <tr key={exp.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exp.status)}
                        <span className={getStatusBadge(exp.status)}>
                          {exp.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-neutral-800">{exp.id}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="text-neutral-700 font-medium">{exp.docTitle}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{exp.docId}</div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-block px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded">
                        {exp.type}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                          exp.sourceStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {exp.sourceStatus}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-neutral-600 text-xs">{formatDate(exp.createdAt)}</td>
                    <td className="py-4 px-5 text-neutral-600 text-xs">
                      {exp.completedAt ? formatDate(exp.completedAt) : '—'}
                    </td>
                    <td className="py-4 px-5 text-neutral-600 text-xs font-semibold">
                      {formatDuration(exp.createdAt, exp.completedAt)}
                    </td>
                    <td className="py-4 px-5">
                      {exp.status === 'Ready' && exp.url ? (
                        <button
                          type="button"
                          onClick={() => handleDownloadClick(exp)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition border border-blue-200"
                          title="Download export"
                        >
                          <LuDownload className="w-3.5 h-3.5" />
                          Download
                        </button>
                      ) : exp.status === 'Failed' ? (
                        <span className="text-xs text-rose-600 font-semibold">Failed</span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 px-5 text-center text-neutral-500 text-sm">
                    No exports found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FooterInfoCard title="Registry note" accent="blue">
        This is a read-only exports registry showing all past and present export jobs. Status filters help locate exports by processing state. For per-document export management, visit the specific document's Exports tab.
      </FooterInfoCard>

      {/* Download Destination Dialog */}
      {downloadDialogExport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-neutral-900">Download Export</h2>
                <p className="text-xs text-neutral-500 mt-1">{downloadDialogExport.docTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDownloadDialogExport(null);
                  setSelectedDestination(null);
                  setDownloadError(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition"
                disabled={isDownloading}
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {!selectedDestination ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600 mb-4">Where would you like to save this export?</p>

                <button
                  type="button"
                  onClick={() => setSelectedDestination('local')}
                  disabled={isDownloading}
                  className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <LuHardDrive className="w-5 h-5 text-neutral-700 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="font-bold text-neutral-900 text-sm">Local Directory</div>
                    <div className="text-xs text-neutral-500 mt-0.5">Save to your computer using browser's download dialog</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDestination('remote')}
                  disabled={isDownloading}
                  className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <LuCloud className="w-5 h-5 text-neutral-700 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="font-bold text-neutral-900 text-sm">Remote Server</div>
                    <div className="text-xs text-neutral-500 mt-0.5">Upload to external storage (S3, FTP, or custom server)</div>
                  </div>
                </button>
              </div>
            ) : selectedDestination === 'local' ? (
              <div className="space-y-4">
                {downloadError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                    <p className="text-xs text-rose-700 font-semibold">Download failed</p>
                    <p className="text-xs text-rose-600 mt-1.5">{downloadError}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Ready to download:</strong> Click the button below to open your browser's save dialog and choose a location.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-neutral-600 font-semibold">File details:</p>
                  <div className="bg-neutral-50 rounded p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Filename:</span>
                      <span className="font-semibold text-neutral-900">
                        {downloadDialogExport.docTitle.replace(/\s+/g, '_')}_{downloadDialogExport.id}.{downloadDialogExport.type.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Type:</span>
                      <span className="font-semibold text-neutral-900">{downloadDialogExport.type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDestination(null);
                      setDownloadError(null);
                    }}
                    disabled={isDownloading}
                    className="flex-1 px-3 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleLocalDownload}
                    disabled={isDownloading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <LuLoader className="w-4 h-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <LuDownload className="w-4 h-4" />
                        Save File
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : selectedDestination === 'remote' ? (
              <div className="space-y-4">
                {downloadError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                    <p className="text-xs text-rose-700 font-semibold">Upload failed</p>
                    <p className="text-xs text-rose-600 mt-1.5">{downloadError}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    <strong>Remote Upload:</strong> Provide the destination server URL where the file will be uploaded.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-700">
                    Remote Server URL
                  </label>
                  <input
                    type="url"
                    value={remoteServerUrl}
                    onChange={(e) => setRemoteServerUrl(e.target.value)}
                    placeholder="https://storage.example.com/uploads"
                    disabled={isDownloading}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Examples: SFTP URL, S3 endpoint, or custom API endpoint
                  </p>
                </div>

                <div className="bg-neutral-50 rounded p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Filename:</span>
                    <span className="font-semibold text-neutral-900">
                      {downloadDialogExport.docTitle.replace(/\s+/g, '_')}_{downloadDialogExport.id}.{downloadDialogExport.type.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Type:</span>
                    <span className="font-semibold text-neutral-900">{downloadDialogExport.type}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDestination(null);
                      setDownloadError(null);
                    }}
                    disabled={isDownloading}
                    className="flex-1 px-3 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded transition disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoteDownload}
                    disabled={isDownloading || !remoteServerUrl.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <LuLoader className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <LuCloud className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportsRegistryPage;
