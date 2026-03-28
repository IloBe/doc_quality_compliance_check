import fs from 'fs';
import path from 'path';
import { GetStaticProps } from 'next';
import React from 'react';
import { marked } from 'marked';

export const getStaticProps: GetStaticProps = async () => {
  const filePath = path.join(process.cwd(), 'public', 'docs', 'governance-manual.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const html = marked(fileContent);
  return {
    props: {
      html,
    },
  };
};

const GovernanceManualPage = ({ html }: { html: string }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-8 md:px-24">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-black text-blue-900 mb-4">Governance Manual</h1>
        <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

export default GovernanceManualPage;
