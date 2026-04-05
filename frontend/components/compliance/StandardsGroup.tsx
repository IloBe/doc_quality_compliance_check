import React from 'react';
import { LuCircleAlert, LuCircleCheck} from 'react-icons/lu';
import StandardCard from './StandardCard';
import { ComplianceStandard, categoryMetadata } from '../../lib/complianceStandards';

type StandardsGroupProps = {
  title: string;
  description?: string;
  isAlwaysOn: boolean;
  standards: ComplianceStandard[];
};

/**
 * StandardsGroup Component
 * 
 * Responsibility: Render a single group of compliance standards with appropriate
 * visual hierarchy and information. Follows Single Responsibility Principle by
 * handling only the presentation of one group category.
 * 
 * Props:
 *   - title: Section heading
 *   - description: Optional explanatory text for the category
 *   - isAlwaysOn: Visual/behavioral indicator for Always-On vs Conditional
 *   - standards: Array of ComplianceStandard items to display
 */
const StandardsGroup = ({ title, description, isAlwaysOn, standards }: StandardsGroupProps) => {
  const headerBg = isAlwaysOn ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200' : 'bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200';
  const headerIcon = isAlwaysOn ? 
    <LuCircleCheck className="w-5 h-5 text-emerald-600" /> :
    <LuCircleAlert className="w-5 h-5 text-amber-600" />;

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div className={`rounded-2xl border-2 ${headerBg} p-6 space-y-2`}>
        <div className="flex items-center gap-3">
          {headerIcon}
          <h2 className="text-2xl font-black text-neutral-900">{title}</h2>
        </div>
        {description && <p className="text-sm font-medium text-neutral-700 ml-8">{description}</p>}
        <p className="text-xs font-semibold text-neutral-600 ml-8 uppercase tracking-wide">
          {standards.length} {standards.length === 1 ? 'framework' : 'frameworks'}
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {standards.map((standard) => (
          <StandardCard key={standard.id} standard={standard} />
        ))}
      </div>
    </div>
  );
};

export default StandardsGroup;
