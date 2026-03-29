import fs from 'fs';
import path from 'path';
import React, { useMemo, useState } from 'react';
import { GetStaticProps } from 'next';
import { marked } from 'marked';
import { LuFileText, LuInfo, LuList, LuChevronRight } from 'react-icons/lu';
import WhyThisPageMatters from '../components/WhyThisPageMatters';

type SopItem = {
  id: string;
  fileName: string;
  title: string;
  documentId?: string;
  html: string;
};

type SopPageProps = {
  sops: SopItem[];
};

function parseTitle(markdown: string, fallback: string): string {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  return (titleMatch?.[1] || fallback).trim();
}

function parseDocumentId(markdown: string): string | undefined {
  const idMatch = markdown.match(/\*\*Document ID:\*\*\s*`?([^`\n]+)`?/i);
  return idMatch?.[1]?.trim();
}

export const getStaticProps: GetStaticProps<SopPageProps> = async () => {
  const sopDir = path.join(process.cwd(), '..', 'templates', 'sop');
  const files = fs
    .readdirSync(sopDir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const sops: SopItem[] = files.map((fileName) => {
    const fullPath = path.join(sopDir, fileName);
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const fallbackTitle = fileName.replace(/\.md$/i, '').replace(/_/g, ' ');

    return {
      id: fileName,
      fileName,
      title: parseTitle(markdown, fallbackTitle),
      documentId: parseDocumentId(markdown),
      html: marked.parse(markdown) as string,
    };
  });

  return {
    props: {
      sops,
    },
  };
};

const SopsPage = ({ sops }: SopPageProps) => {
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);
  const [activeSopId, setActiveSopId] = useState<string>(sops[0]?.id || '');

  const activeSop = useMemo(() => sops.find((s) => s.id === activeSopId) || sops[0], [activeSopId, sops]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Governance Library</div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">SOPs</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-500 font-medium mt-1">Select a SOP card to open and review its markdown content.</p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <LuList className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-600">{sops.length} SOP Files</span>
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters description="The SOP page centralizes controlled process templates so teams can quickly review required structure, ownership, and evidence expectations before execution or audit." />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          {sops.map((sop) => {
            const active = activeSop?.id === sop.id;
            return (
              <button
                key={sop.id}
                type="button"
                onClick={() => setActiveSopId(sop.id)}
                className={`w-full text-left bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  active
                    ? 'border-blue-300 ring-2 ring-blue-100'
                    : 'border-neutral-200 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-2">
                      <LuFileText className="w-3.5 h-3.5" />
                      SOP
                    </div>
                    <h3 className="text-sm font-black text-neutral-900 leading-snug">{sop.title}</h3>
                    <p className="text-[11px] text-neutral-500 mt-1">{sop.documentId || 'Document ID not set'}</p>
                    <p className="text-[11px] text-neutral-400 mt-1 truncate">{sop.fileName}</p>
                  </div>
                  <LuChevronRight className={`w-4 h-4 mt-1 ${active ? 'text-blue-600' : 'text-neutral-300'}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
          {activeSop ? (
            <>
              <div className="border-b border-neutral-100 pb-4 mb-4">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{activeSop.title}</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {activeSop.documentId || 'Document ID not set'} • {activeSop.fileName}
                </p>
              </div>
              <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: activeSop.html }} />
            </>
          ) : (
            <p className="text-neutral-500">No SOP markdown files found in templates/sop.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SopsPage;
