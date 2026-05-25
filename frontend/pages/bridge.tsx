import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import BridgeOverviewStatCard from '../components/bridge/BridgeOverviewStatCard';
import BridgeSystemStatusCard from '../components/bridge/BridgeSystemStatusCard';
import { useCan } from '../lib/authContext';
import { bridgeOverviewStats } from '../lib/bridgeOverview';
import { fetchBridgeRuntimeTopology, BridgeRuntimeTopology, reloadBridgeAgents } from '../lib/bridgeClient';
import { mapBridgeFailureGuidance, BridgeFailureGuidance } from '../lib/bridgeRunViewModel';
import { listDocuments } from '../lib/documentRetrievalClient';
import { ACCEPTED_UPLOAD_TYPES_LABEL, uploadDocument, validateUploadFileType } from '../lib/documentUploadClient';
import { Document, useMockStore } from '../lib/mockStore';
import { 
  LuExternalLink, 
   LuFileText,
   LuLoader,
  LuRefreshCcw,
} from 'react-icons/lu';

const BridgePage = () => {
   const router = useRouter();
   const documents = useMockStore((state) => state.documents as Document[]);
   const addDocument = useMockStore((state) => state.addDocument as (doc: Document) => void);
   const currentUserId = useMockStore((state) => state.currentUserId as string);
   const fileInputRef = useRef<HTMLInputElement | null>(null);

   const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
   const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
   const [isUploadingDocument, setIsUploadingDocument] = useState(false);
   const [documentsInfo, setDocumentsInfo] = useState<string | null>(null);
   const [documentsError, setDocumentsError] = useState<string | null>(null);
   const [isReloading, setIsReloading] = useState(false);
   const [reloadInfo, setReloadInfo] = useState<string | null>(null);
   const [reloadError, setReloadError] = useState<string | null>(null);
   const [reloadFailureGuidance, setReloadFailureGuidance] = useState<BridgeFailureGuidance | null>(null);
   const [runtimeTopology, setRuntimeTopology] = useState<BridgeRuntimeTopology | null>(null);
   const [isLoadingRuntimeTopology, setIsLoadingRuntimeTopology] = useState(false);
   const [runtimeTopologyError, setRuntimeTopologyError] = useState<string | null>(null);
   const [runtimeFailureGuidance, setRuntimeFailureGuidance] = useState<BridgeFailureGuidance | null>(null);

   const useBackendBridge = String(process.env.NEXT_PUBLIC_BRIDGE_SOURCE || 'backend').trim().toLowerCase() !== 'demo';
   const canRunBridge = useCan('bridge.run');

   useEffect(() => {
      let active = true;
      const loadDocuments = async () => {
         setIsLoadingDocuments(true);
         setDocumentsInfo(null);
         setDocumentsError(null);
         const result = await listDocuments();
         if (!active) {
            return;
         }

         if (!result.ok) {
            setDocumentsError('Failed to load documents for bridge orchestration.');
            setIsLoadingDocuments(false);
            return;
         }

         for (const item of result.documents) {
            if (!documents.find((doc) => doc.id === item.id)) {
               addDocument(item);
            }
         }

         setIsLoadingDocuments(false);
      };

      void loadDocuments();
      return () => {
         active = false;
      };
   }, [addDocument, documents]);

   const queryDocId = useMemo(
      () => (typeof router.query.docId === 'string' ? router.query.docId : ''),
      [router.query.docId],
   );

   const resolvedSelectedDocumentId = useMemo(() => {
      if (queryDocId) {
         return queryDocId;
      }
      if (selectedDocumentId) {
         return selectedDocumentId;
      }
      return documents[0]?.id || '';
   }, [documents, queryDocId, selectedDocumentId]);

   useEffect(() => {
      let mounted = true;

      const loadRuntimeTopology = async () => {
         setIsLoadingRuntimeTopology(true);
         setRuntimeTopologyError(null);
         try {
            const payload = await fetchBridgeRuntimeTopology();
            if (!mounted) {
               return;
            }
            setRuntimeTopology(payload);
            setRuntimeFailureGuidance(null);
         } catch (error) {
            if (!mounted) {
               return;
            }
            setRuntimeFailureGuidance(mapBridgeFailureGuidance(error));
            const message = error instanceof Error ? error.message : 'Failed to load bridge runtime topology.';
            setRuntimeTopologyError(message);
         } finally {
            if (mounted) {
               setIsLoadingRuntimeTopology(false);
            }
         }
      };

      void loadRuntimeTopology();
      return () => {
         mounted = false;
      };
   }, []);

   const selectedDocument = useMemo(
      () => documents.find((item) => item.id === resolvedSelectedDocumentId) || null,
      [documents, resolvedSelectedDocumentId],
   );

   const handleReloadAgents = async () => {
      setIsReloading(true);
      setReloadInfo(null);
      setReloadError(null);
      setReloadFailureGuidance(null);

      if (!useBackendBridge) {
         setReloadInfo('Demo mode: agent runtime was refreshed from mock bridge topology.');
         setIsReloading(false);
         return;
      }

      try {
         const result = await reloadBridgeAgents();
         const readyCount = result.agents.filter((agent) => agent.status.toLowerCase() === 'ready').length;
         setReloadInfo(
            `${result.message} ${readyCount}/${result.agents.length} agents ready. Requirements version: ${result.requirements_version}.`
         );
         const topology = await fetchBridgeRuntimeTopology();
         setRuntimeTopology(topology);
         setRuntimeTopologyError(null);
         setRuntimeFailureGuidance(null);
      } catch (error) {
         setReloadFailureGuidance(mapBridgeFailureGuidance(error));
         const message = error instanceof Error ? error.message : 'Failed to reload bridge agents.';
         setReloadError(message);
      } finally {
         setIsReloading(false);
      }
   };

   const handleOpenBridgeRun = async () => {
      if (!canRunBridge) {
         setDocumentsError('Your role does not include Bridge Run permission.');
         setDocumentsInfo(null);
         return;
      }

      if (!selectedDocument) {
         setDocumentsError('Select a document first to open a bridge run.');
         setDocumentsInfo(null);
         return;
      }

      setDocumentsError(null);
      setDocumentsInfo(`Selected active document: ${selectedDocument.title} (${selectedDocument.id}).`);

      await router.push({
         pathname: `/doc/${selectedDocument.id}/bridge`,
         query: {
            title: selectedDocument.title,
            type: selectedDocument.type || 'generic',
         },
      });
   };

   const handleLocalFilePickerClick = () => {
      if (isUploadingDocument) {
         setDocumentsInfo('Document upload already in progress.');
         setDocumentsError(null);
         return;
      }
      fileInputRef.current?.click();
   };

   const handleLocalFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
         return;
      }

      const validation = validateUploadFileType(file);
      if (!validation.ok) {
        const extensionLabel = validation.extension ? `.${validation.extension}` : 'unknown';
        setDocumentsError(`Unsupported file type ${extensionLabel}. Accepted types: ${ACCEPTED_UPLOAD_TYPES_LABEL}.`);
        setDocumentsInfo(null);
        event.target.value = '';
        return;
      }

      setIsUploadingDocument(true);
      setDocumentsInfo(null);
      setDocumentsError(null);

      try {
        const result = await uploadDocument(file, currentUserId);
        if (!result.ok || !result.document) {
          setDocumentsError(result.message || 'Failed to upload selected local document.');
          return;
        }

        addDocument(result.document);
        setSelectedDocumentId(result.document.id);
        setDocumentsInfo(`Local document selected and activated: ${result.document.title} (${result.document.id}).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to select local document.';
        setDocumentsError(message);
      } finally {
        setIsUploadingDocument(false);
        event.target.value = '';
      }
   };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
         <PageHeaderWithWhy
            eyebrow="Bridge Architecture"
            title="Workflow Orchestration"
            subtitle="Multi-agent orchestration pipeline for document compliance and quality analysis."
            whyDescription="The Bridge page is the orchestration view for document checks. It shows how a document moves through Inspection, Compliance, Research, and final Quality Gate steps. This helps QA, auditors, and product leads verify process sequence, understand decision context, and produce traceable evidence for audits."
            rightContent={
               <div className="flex items-center gap-3">
                  <button
                     type="button"
                     onClick={handleLocalFilePickerClick}
                     disabled={isUploadingDocument}
                     className={`flex items-center gap-2 px-5 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition uppercase text-[10px] tracking-widest shadow-sm ${
                        isUploadingDocument ? 'opacity-60 cursor-not-allowed' : ''
                     }`}
                  >
                     {isUploadingDocument ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuFileText className="w-4 h-4" />}
                     {isUploadingDocument ? 'Selecting...' : 'Select Local File'}
                  </button>
                  <input
                     ref={fileInputRef}
                     type="file"
                     accept=".md,.txt,.pdf,.docx"
                     onChange={handleLocalFileSelected}
                     className="hidden"
                  />
                  <button
                     type="button"
                     onClick={handleReloadAgents}
                     disabled={isReloading}
                     className={`flex items-center gap-2 px-5 py-3 bg-white border border-neutral-200 text-neutral-600 font-bold rounded-2xl hover:bg-neutral-50 transition uppercase text-[10px] tracking-widest shadow-sm ${
                        isReloading ? 'opacity-60 cursor-not-allowed' : ''
                     }`}
                  >
                     {isReloading ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuRefreshCcw className="w-4 h-4" />}
                     {isReloading ? 'Reloading...' : 'Reload Agents'}
                  </button>
                  <button
                     onClick={handleOpenBridgeRun}
                     disabled={!selectedDocument || !canRunBridge}
                     title={canRunBridge ? 'Open selected document bridge run' : 'Insufficient role permissions'}
                     className={`flex items-center gap-2 px-5 py-3 font-bold rounded-2xl transition uppercase text-[10px] tracking-widest ${
                        selectedDocument && canRunBridge
                           ? 'bg-neutral-900 text-white hover:bg-blue-600'
                           : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                     }`}
                  >
                     <LuExternalLink className="w-4 h-4" />
                     Open Bridge Run
                  </button>
               </div>
            }
         />

         <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-base font-black text-neutral-900">Select Document for Bridge Run</h2>
                  <p className="text-xs text-neutral-500">The selected document becomes the active document for workflow orchestration.</p>
               </div>
               {isLoadingDocuments ? <span className="text-xs font-semibold text-neutral-500">Loading documents...</span> : null}
            </div>

            {documentsError ? (
               <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{documentsError}</div>
            ) : null}

            {documentsInfo ? (
               <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{documentsInfo}</div>
            ) : null}

            {documents.length === 0 && !isLoadingDocuments ? (
               <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  No documents available. Select a local document with &quot;Select Local File&quot; or upload/analyze a document in Document Hub.
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {documents.map((item) => {
                     const isActive = resolvedSelectedDocumentId === item.id;
                     return (
                        <button
                           key={item.id}
                           type="button"
                           onClick={() => setSelectedDocumentId(item.id)}
                           className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                              isActive
                                 ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                                 : 'border-neutral-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                           }`}
                        >
                           <div className="flex items-start justify-between gap-3">
                              <div>
                                 <div className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-blue-700' : 'text-neutral-500'}`}>
                                    {isActive ? 'Active Document' : 'Document'}
                                 </div>
                                 <div className="mt-1 text-sm font-bold text-neutral-900 break-all">{item.title}</div>
                                 <div className="mt-1 text-[11px] text-neutral-500 font-mono">{item.id}</div>
                              </div>
                              <LuFileText className={`w-4 h-4 mt-0.5 ${isActive ? 'text-blue-600' : 'text-neutral-300'}`} />
                           </div>
                        </button>
                     );
                  })}
               </div>
            )}
         </div>

         {reloadInfo ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
               {reloadInfo}
            </div>
         ) : null}

         {reloadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
               {reloadError}
            </div>
         ) : null}

         {reloadFailureGuidance ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-2">
               <div className="font-black uppercase tracking-widest">{reloadFailureGuidance.title}</div>
               <div>{reloadFailureGuidance.message}</div>
               <ul className="list-disc ml-4 space-y-1">
                  {reloadFailureGuidance.actionPoints.map((item) => (
                     <li key={item}>{item}</li>
                  ))}
               </ul>
            </div>
         ) : null}

         {runtimeFailureGuidance ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 space-y-2">
               <div className="font-black uppercase tracking-widest">{runtimeFailureGuidance.title}</div>
               <div>{runtimeFailureGuidance.message}</div>
               <ul className="list-disc ml-4 space-y-1">
                  {runtimeFailureGuidance.actionPoints.map((item) => (
                     <li key={item}>{item}</li>
                  ))}
               </ul>
               {runtimeFailureGuidance.correlationId ? (
                  <div className="font-mono text-[10px] text-blue-700">
                     Correlation ID: {runtimeFailureGuidance.correlationId}
                  </div>
               ) : null}
            </div>
         ) : null}

      {/* Hero: Live Agent Mesh Visualization Stub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {bridgeOverviewStats.map((stat) => (
           <BridgeOverviewStatCard key={stat.id} stat={stat} />
         ))}
      </div>

      <BridgeSystemStatusCard
         topology={runtimeTopology}
         loading={isLoadingRuntimeTopology || isReloading}
         error={runtimeTopologyError}
      />

         <FooterInfoCard title="Governance note" accent="blue">
             Bridge orchestrates the controlled analysis sequence. Any downstream approval or rejection decision should reference the corresponding pipeline evidence and session trace.
         </FooterInfoCard>
    </div>
  );
};

export default BridgePage;
