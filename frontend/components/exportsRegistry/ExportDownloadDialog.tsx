import React from 'react';
import { LuCloud, LuDownload, LuHardDrive, LuLoader, LuX } from 'react-icons/lu';
import { getButtonClass } from '../buttonStyles';
import { ExportJob } from '../../lib/mockStore';
import { DownloadDestination, buildExportFilename } from '../../lib/exportRegistryViewModel';

type ExportDownloadDialogProps = {
  exportJob: ExportJob | null;
  selectedDestination: DownloadDestination;
  remoteServerUrl: string;
  downloadError: string | null;
  isDownloading: boolean;
  onClose: () => void;
  onSelectDestination: (value: DownloadDestination) => void;
  onRemoteServerUrlChange: (value: string) => void;
  onBack: () => void;
  onLocalDownload: () => void;
  onRemoteUpload: () => void;
};

const ExportDownloadDialog = ({
  exportJob,
  selectedDestination,
  remoteServerUrl,
  downloadError,
  isDownloading,
  onClose,
  onSelectDestination,
  onRemoteServerUrlChange,
  onBack,
  onLocalDownload,
  onRemoteUpload,
}: ExportDownloadDialogProps) => {
  if (!exportJob) {
    return null;
  }

  const filename = buildExportFilename(exportJob);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-neutral-900">Download Export</h2>
            <p className="text-xs text-neutral-500 mt-1">{exportJob.docTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              onClick={() => onSelectDestination('local')}
              disabled={isDownloading}
              className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition disabled:opacity-50"
            >
              <LuHardDrive className="w-5 h-5 text-neutral-700 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <div className="font-bold text-neutral-900 text-sm">Local Directory</div>
                <div className="text-xs text-neutral-500 mt-0.5">Save to your computer using browser&apos;s download dialog</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectDestination('remote')}
              disabled={isDownloading}
              className="w-full flex items-start gap-3 p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition disabled:opacity-50"
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
                <strong>Ready to download:</strong> Click the button below to open your browser&apos;s save dialog and choose a location.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-neutral-600 font-semibold">File details:</p>
              <div className="bg-neutral-50 rounded p-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-neutral-500">Filename:</span>
                  <span className="font-semibold text-neutral-900 text-right break-all">{filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Type:</span>
                  <span className="font-semibold text-neutral-900">{exportJob.type}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                disabled={isDownloading}
                className={getButtonClass({ variant: 'neutral', size: 'sm', extra: 'flex-1 bg-neutral-100 hover:bg-neutral-200 border-neutral-200' })}
              >
                Back
              </button>
              <button
                type="button"
                onClick={onLocalDownload}
                disabled={isDownloading}
                className={getButtonClass({ variant: 'primary', size: 'sm', extra: 'flex-1 gap-2' })}
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
        ) : (
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
              <label className="block text-xs font-bold text-neutral-700">Remote Server URL</label>
              <input
                type="url"
                value={remoteServerUrl}
                onChange={(event) => onRemoteServerUrlChange(event.target.value)}
                placeholder="https://storage.example.com/uploads"
                disabled={isDownloading}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-50 disabled:opacity-50"
              />
              <p className="text-[11px] text-neutral-500">Examples: SFTP URL, S3 endpoint, or custom API endpoint</p>
            </div>

            <div className="bg-neutral-50 rounded p-3 space-y-1.5 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500">Filename:</span>
                <span className="font-semibold text-neutral-900 text-right break-all">{filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Type:</span>
                <span className="font-semibold text-neutral-900">{exportJob.type}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onBack}
                disabled={isDownloading}
                className={getButtonClass({ variant: 'neutral', size: 'sm', extra: 'flex-1 bg-neutral-100 hover:bg-neutral-200 border-neutral-200' })}
              >
                Back
              </button>
              <button
                type="button"
                onClick={onRemoteUpload}
                disabled={isDownloading || !remoteServerUrl.trim()}
                className={getButtonClass({ variant: 'primary', size: 'sm', extra: 'flex-1 gap-2' })}
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
        )}
      </div>
    </div>
  );
};

export default ExportDownloadDialog;
