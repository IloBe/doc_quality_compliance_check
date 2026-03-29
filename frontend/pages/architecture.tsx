import fs from 'fs';
import path from 'path';
import React, { useMemo, useState } from 'react';
import { GetStaticProps } from 'next';
import { marked } from 'marked';
import { LuHexagon, LuInfo, LuList, LuChevronRight } from 'react-icons/lu';
import WhyThisPageMatters from '../components/WhyThisPageMatters';

type Arc42Item = {
  id: string;
  fileName: string;
  title: string;
  version?: string;
  status?: string;
  html: string;
};

type ArchitecturePageProps = {
  templates: Arc42Item[];
};

function parseTitle(markdown: string, fallback: string): string {
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  return (titleMatch?.[1] || fallback).trim();
}

function parseField(markdown: string, fieldName: string): string | undefined {
  const re = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.+)`, 'i');
  const match = markdown.match(re);
  return match?.[1]?.replace(/_{3,}/g, '').trim() || undefined;
}

export const getStaticProps: GetStaticProps<ArchitecturePageProps> = async () => {
  const templateDir = path.join(process.cwd(), '..', 'templates', 'arc42');
  const files = fs
    .readdirSync(templateDir)
    .filter((f) => f.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const templates: Arc42Item[] = files.map((fileName) => {
    const fullPath = path.join(templateDir, fileName);
    const markdown = fs.readFileSync(fullPath, 'utf8');
    const fallbackTitle = fileName.replace(/\.md$/i, '').replace(/_/g, ' ');

    return {
      id: fileName,
      fileName,
      title: parseTitle(markdown, fallbackTitle),
      version: parseField(markdown, 'Version'),
      status: parseField(markdown, 'Status'),
      html: marked.parse(markdown) as string,
    };
  });

  return {
    props: {
      templates,
    },
  };
};

const ArchitecturePage = ({ templates }: ArchitecturePageProps) => {
  const [showWhyThisPageMatters, setShowWhyThisPageMatters] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === activeTemplateId) || templates[0],
    [activeTemplateId, templates],
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">
            Governance Library
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Architecture (arc42)</h1>
            <button
              type="button"
              onClick={() => setShowWhyThisPageMatters((prev) => !prev)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-blue-700 hover:bg-blue-50 transition"
              title="Why this page matters"
            >
              <LuInfo className="w-4 h-4" />
            </button>
          </div>
          <p className="text-neutral-500 font-medium mt-1">
            Select a template card to open and review its arc42 architecture documentation.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <LuList className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
            {templates.length} arc42 Template{templates.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {showWhyThisPageMatters && (
        <WhyThisPageMatters description="arc42 provides a proven, lightweight structure for software and system architecture documentation. Using a standardised template ensures every architectural decision is captured consistently, making systems easier to audit, onboard, and evolve." />
      )}

      {/* Main layout: card list left, content right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Card list */}
        <div className="xl:col-span-1 space-y-4">
          {templates.map((tmpl) => {
            const active = activeTemplate?.id === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setActiveTemplateId(tmpl.id)}
                className={`w-full text-left bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  active
                    ? 'border-blue-300 ring-2 ring-blue-100'
                    : 'border-neutral-200 hover:border-blue-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest mb-2">
                      <LuHexagon className="w-3.5 h-3.5" />
                      arc42
                    </div>
                    <h3 className="text-sm font-black text-neutral-900 leading-snug">{tmpl.title}</h3>
                    {tmpl.version && (
                      <p className="text-[11px] text-neutral-500 mt-1">v{tmpl.version}</p>
                    )}
                    {tmpl.status && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">{tmpl.status}</p>
                    )}
                    <p className="text-[11px] text-neutral-400 mt-1 truncate">{tmpl.fileName}</p>
                  </div>
                  <LuChevronRight
                    className={`w-4 h-4 mt-1 flex-shrink-0 ${active ? 'text-blue-600' : 'text-neutral-300'}`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
          {activeTemplate ? (
            <>
              <div className="border-b border-neutral-100 pb-4 mb-4">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{activeTemplate.title}</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {[activeTemplate.version && `v${activeTemplate.version}`, activeTemplate.status, activeTemplate.fileName]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
              <div
                className="prose prose-blue max-w-none"
                dangerouslySetInnerHTML={{ __html: activeTemplate.html }}
              />
            </>
          ) : (
            <p className="text-neutral-500">No arc42 markdown files found in templates/arc42.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;
