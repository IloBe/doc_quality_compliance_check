import React from 'react';
import { Arc42Item, buildArc42MetaLine } from '../../lib/architectureViewModel';
import { markdownContentClass } from '../../lib/markdownStyles';

type Arc42TemplateContentPanelProps = {
  template?: Arc42Item;
};

const Arc42TemplateContentPanel = ({ template }: Arc42TemplateContentPanelProps) => {
  return (
    <div className="xl:col-span-2 bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
      {template ? (
        <>
          <div className="border-b border-neutral-100 pb-4 mb-4">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{template.title}</h2>
            <p className="text-sm text-neutral-500 mt-1">{buildArc42MetaLine(template)}</p>
          </div>
          <div className={markdownContentClass} dangerouslySetInnerHTML={{ __html: template.html }} />
        </>
      ) : (
        <p className="text-neutral-500">No arc42 markdown files found in templates/arc42.</p>
      )}
    </div>
  );
};

export default Arc42TemplateContentPanel;
