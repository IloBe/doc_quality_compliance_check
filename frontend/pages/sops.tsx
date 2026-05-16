import fs from 'fs';
import path from 'path';
import React, { useCallback, useEffect, useMemo } from 'react';
import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { marked } from 'marked';
import { LuList } from 'react-icons/lu';
import { getHeaderInfoChipClass } from '../components/buttonStyles';
import FooterInfoCard from '../components/FooterInfoCard';
import PageHeaderWithWhy from '../components/PageHeaderWithWhy';
import SopContentPanel from '../components/sops/SopContentPanel';
import SopListPanel from '../components/sops/SopListPanel';
import { syncQueryParam } from '../lib/queryState';
import { parseSopDocumentId, parseSopTitle, resolveActiveSop, SopItem } from '../lib/sopsViewModel';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

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
  const router = useRouter();

  const activeSopId = useMemo(() => {
    const querySop = readQueryValue(router.query.sop);
    if (querySop && sops.some((item) => item.id === querySop)) {
      return querySop;
    }
    return sops[0]?.id || '';
  }, [router.query.sop, sops]);

  const commitActiveSopId = useCallback((nextSopId: string) => {
    if (!router.isReady) {
      return;
    }

    const currentSopId = readQueryValue(router.query.sop);
    if (currentSopId === nextSopId) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'sop') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    const defaultSopId = sops[0]?.id || '';
    if (nextSopId && nextSopId !== defaultSopId) {
      nextQuery.sop = nextSopId;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [router, sops]);

  const activeSop = useMemo(() => resolveActiveSop(sops, activeSopId), [activeSopId, sops]);

  useEffect(() => {
    const defaultSopId = sops[0]?.id || '';
    syncQueryParam(router, 'sop', activeSop?.id ?? '', {
      omitWhen: (value) => value === defaultSopId,
    });
  }, [activeSop?.id, router, sops]);

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
        <SopListPanel sops={sops} activeSopId={activeSop?.id || ''} onSelect={commitActiveSopId} />
        <SopContentPanel sop={activeSop} />
      </div>

      <FooterInfoCard title="Governance note" accent="blue">
        SOPs are controlled procedures. Reviews and operational decisions should reference the correct version and preserve traceability of ownership and approval state.
      </FooterInfoCard>
    </div>
  );
};

export default SopsPage;
