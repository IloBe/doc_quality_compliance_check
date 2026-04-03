import React from 'react';
import { LuInfo, LuUsers } from 'react-icons/lu';

type StakeholderSessionCardProps = {
  email?: string | null;
  roles: string[];
};

const StakeholderSessionCard = ({ email, roles }: StakeholderSessionCardProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Current session</h2>
      <div className="text-sm text-neutral-700 space-y-1">
        <div className="inline-flex items-center gap-2"><LuUsers className="w-4 h-4 text-neutral-400" /> User: {email || 'n/a'}</div>
        <div className="inline-flex items-center gap-2"><LuInfo className="w-4 h-4 text-neutral-400" /> Roles: {roles.join(', ') || 'none'}</div>
      </div>
    </div>
  );
};

export default StakeholderSessionCard;
