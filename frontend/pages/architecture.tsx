import fs from 'fs';
import path from 'path';
import React, { useMemo, useState } from 'react';
import { GetStaticProps } from 'next';
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

    return {
      id: fileName,
      fileName,
      title: parseArc42Title(markdown, fallbackTitle),
      version: parseArc42Field(markdown, 'Version'),
      status: parseArc42Field(markdown, 'Status'),
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
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');

  const activeTemplate = useMemo(
    () => resolveActiveArc42Template(templates, activeTemplateId),
    [activeTemplateId, templates],
  );

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
          onSelect={setActiveTemplateId}
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
