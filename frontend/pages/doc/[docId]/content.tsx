import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { LuArrowLeft, LuExternalLink, LuFileText, LuLoader } from 'react-icons/lu';
import { getButtonClass } from '../../../components/buttonStyles';
import PageHeaderWithWhy from '../../../components/PageHeaderWithWhy';
import { formatDateTime } from '../../../lib/dateTime';
import { getDocumentById, RetrievedDocument } from '../../../lib/documentRetrievalClient';
import { useMockStore } from '../../../lib/mockStore';

const DocContentPage = () => {
  const router = useRouter();
  const docId = typeof router.query.docId === 'string' ? router.query.docId : '';

  const getDocById = useMockStore((state) => state.getDocById);

  const [doc, setDoc] = useState<RetrievedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      const local = getDocById(docId);
      if (local) {
        if (mounted) {
          setDoc({
            id: local.id,
            title: local.title,
            type: local.type ?? 'generic',
            product: local.product ?? '',
            status: local.status,
            version: local.version ?? '',
            lockedBy: local.lockedBy ?? null,
            updatedAt: local.updatedAt ?? '',
            updatedBy: local.updatedBy ?? 'system',
            content: local.content ?? '',
          });
          setIsLoading(false);
        }
        return;
      }

      const result = await getDocumentById(docId);
      if (!mounted) {
        return;
      }
      if (result.ok && result.document) {
        setDoc(result.document);
      } else {
        setError(result.message ?? 'Document could not be loaded.');
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [docId, getDocById]);

  if (!docId || (isLoading && !doc)) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-500 text-sm gap-2">
        <LuLoader className="w-4 h-4 animate-spin" />
        Loading document…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeaderWithWhy
          eyebrow="Document Hub"
          title="Document Content"
          subtitle="Document not found"
          whyDescription="Document content is loaded from the backend to support artifact traceability and bridge run evidence review."
        />
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <p className="text-neutral-700 mb-4">Could not load document <span className="font-mono text-sm">{docId}</span></p>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <Link
            href="/artifact-lab"
            className={getButtonClass({ variant: 'primary', size: 'md', extra: 'text-sm normal-case tracking-normal font-semibold' })}
          >
            <LuArrowLeft className="w-4 h-4" />
            Back to Artifact Lab
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Document Hub"
        title={doc?.title ?? docId}
        subtitle={[doc?.type, doc?.product, doc?.version].filter(Boolean).join(' · ')}
        whyDescription="Document content provides the source text used by Bridge runs and Artifact Lab to generate, validate and cite compliance artifacts."
        rightContent={
          <div className="flex items-center gap-2">
            <Link
              href="/artifact-lab"
              className={getButtonClass({ variant: 'neutral', size: 'sm' })}
            >
              <LuArrowLeft className="w-3.5 h-3.5" />
              Artifact Lab
            </Link>
            <Link
              href={`/doc/${encodeURIComponent(docId)}/bridge`}
              className={getButtonClass({ variant: 'primary', size: 'sm' })}
            >
              <LuExternalLink className="w-3.5 h-3.5" />
              Open Bridge Run
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <aside className="xl:col-span-1 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <LuFileText className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Document Metadata</span>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">ID</dt>
                <dd className="font-mono text-neutral-700 break-all mt-0.5">{doc?.id}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Type</dt>
                <dd className="text-neutral-700 mt-0.5">{doc?.type || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Product</dt>
                <dd className="text-neutral-700 mt-0.5">{doc?.product || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</dt>
                <dd className="mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                    doc?.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : doc?.status === 'Draft'
                        ? 'bg-neutral-100 text-neutral-600'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {doc?.status || '—'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Version</dt>
                <dd className="text-neutral-700 mt-0.5">{doc?.version || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Last updated</dt>
                <dd className="text-neutral-700 mt-0.5">{doc?.updatedAt ? formatDateTime(doc.updatedAt, doc.updatedAt) : '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Updated by</dt>
                <dd className="text-neutral-700 mt-0.5">{doc?.updatedBy || '—'}</dd>
              </div>
            </dl>
          </div>
        </aside>

        <main className="xl:col-span-3 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-4">Extracted content</h2>
          {doc?.content ? (
            <pre className="whitespace-pre-wrap text-sm text-neutral-800 font-mono leading-relaxed bg-neutral-50 border border-neutral-100 rounded-xl p-5 overflow-x-auto max-h-[640px] overflow-y-auto">
              {doc.content}
            </pre>
          ) : (
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-6 text-sm text-neutral-500 text-center">
              No extracted text available for this document.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DocContentPage;
