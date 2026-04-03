import fs from 'fs';
import path from 'path';
import React, { useMemo, useState } from 'react';
import { GetStaticProps } from 'next';
import { marked } from 'marked';
import { LuList } from 'react-icons/lu';
import { getHeaderInfoChipClass } from '../components/buttonStyles';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import SopContentPanel from '../components/sops/SopContentPanel';
import SopListPanel from '../components/sops/SopListPanel';
import { parseSopDocumentId, parseSopTitle, resolveActiveSop, SopItem } from '../lib/sopsViewModel';

type SopPageProps = {
  sops: SopItem[];
};

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
      title: parseSopTitle(markdown, fallbackTitle),
      documentId: parseSopDocumentId(markdown),
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
  const [activeSopId, setActiveSopId] = useState<string>(sops[0]?.id || '');

  const activeSop = useMemo(() => resolveActiveSop(sops, activeSopId), [activeSopId, sops]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <PageHeaderWithWhy
        eyebrow="Governance Library"
        title="SOPs"
        subtitle="Select a SOP card to open and review its markdown content."
        whyDescription="The SOP page centralizes controlled process templates so teams can quickly review required structure, ownership, and evidence expectations before execution or audit."
        rightContent={
          <div className={getHeaderInfoChipClass()}>
            <LuList className="w-4 h-4 text-blue-600" />
            <span>{sops.length} SOP Files</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <SopListPanel sops={sops} activeSopId={activeSop?.id || ''} onSelect={setActiveSopId} />
        <SopContentPanel sop={activeSop} />
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        SOPs are controlled procedures. Reviews and operational decisions should reference the correct version and preserve traceability of ownership and approval state.
      </FooterInfoCard>
    </div>
  );
};

export default SopsPage;
