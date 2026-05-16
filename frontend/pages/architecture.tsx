import fs from 'fs';
import path from 'path';
import React, { useCallback, useEffect, useMemo } from 'react';
import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { marked } from 'marked';
import { LuList } from 'react-icons/lu';
import Arc42TemplateContentPanel from '../components/architecture/Arc42TemplateContentPanel';
import Arc42TemplateListPanel from '../components/architecture/Arc42TemplateListPanel';
import { getHeaderInfoChipClass } from '../components/buttonStyles';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import {
  Arc42Item,
  parseArc42Field,
  parseArc42Title,
  resolveActiveArc42Template,
} from '../lib/architectureViewModel';
import { syncQueryParam } from '../lib/queryState';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

type ArchitecturePageProps = {
  templates: Arc42Item[];
};

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
    const version = parseArc42Field(markdown, 'Version');
    const status = parseArc42Field(markdown, 'Status');

    return {
      id: fileName,
      fileName,
      title: parseArc42Title(markdown, fallbackTitle),
      ...(version ? { version } : {}),
      ...(status ? { status } : {}),
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
  const router = useRouter();

  const activeTemplateId = useMemo(() => {
    const queryTemplate = readQueryValue(router.query.template);
    if (queryTemplate && templates.some((item) => item.id === queryTemplate)) {
      return queryTemplate;
    }
    return templates[0]?.id || '';
  }, [router.query.template, templates]);

  const commitActiveTemplateId = useCallback((nextTemplateId: string) => {
    if (!router.isReady) {
      return;
    }

    const currentTemplateId = readQueryValue(router.query.template);
    if (currentTemplateId === nextTemplateId) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'template') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    const defaultTemplateId = templates[0]?.id || '';
    if (nextTemplateId && nextTemplateId !== defaultTemplateId) {
      nextQuery.template = nextTemplateId;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [router, templates]);

  const activeTemplate = useMemo(
    () => resolveActiveArc42Template(templates, activeTemplateId),
    [activeTemplateId, templates],
  );

  useEffect(() => {
    const defaultTemplateId = templates[0]?.id || '';
    syncQueryParam(router, 'template', activeTemplate?.id ?? '', {
      omitWhen: (value) => value === defaultTemplateId,
    });
  }, [activeTemplate?.id, router, templates]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Governance Library"
        title="Architecture (arc42)"
        subtitle="Select a template card to open and review its arc42 architecture documentation."
        whyDescription="arc42 provides a proven, lightweight structure for software and system architecture documentation. Using a standardised template ensures every architectural decision is captured consistently, making systems easier to audit, onboard, and evolve."
        rightContent={
          <div className={getHeaderInfoChipClass()}>
            <LuList className="w-4 h-4 text-blue-600" />
            <span>
              {templates.length} arc42 Template{templates.length !== 1 ? 's' : ''}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Arc42TemplateListPanel
          templates={templates}
          activeTemplateId={activeTemplate?.id || ''}
          onSelect={commitActiveTemplateId}
        />
        <Arc42TemplateContentPanel template={activeTemplate} />
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        Architecture records are governance evidence for design intent and constraints. Keep arc42 updates consistent with risk handling, control expectations, and change-review rationale.
      </FooterInfoCard>
    </div>
  );
};

export default ArchitecturePage;
