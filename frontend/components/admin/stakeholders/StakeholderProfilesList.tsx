import React from 'react';
import { StakeholderProfileUi } from '../../../lib/adminStakeholdersViewModel';
import { getSelectionStyles } from '../../../lib/selectionStyles';

type StakeholderProfilesListProps = {
  profiles: StakeholderProfileUi[];
  selectedRole: string;
  onSelectRole: (roleId: string) => void;
};

const StakeholderProfilesList = ({ profiles, selectedRole, onSelectRole }: StakeholderProfilesListProps) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 xl:col-span-1">
      <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-3">Profiles</h2>
      <div className="space-y-2">
        {profiles.map((profile) => {
          const active = profile.id === selectedRole;
          const selectionStyles = getSelectionStyles({
            isSelected: active,
            tone: 'blue',
            defaultRowClass: 'border-neutral-200 bg-white',
            idleRowClass: 'hover:bg-neutral-50',
            defaultPrimaryTextClass: 'text-neutral-800',
            defaultSecondaryTextClass: 'text-neutral-500',
          });
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelectRole(profile.id)}
              className={`w-full text-left p-3 rounded-xl border transition ${selectionStyles.rowClass}`}
            >
              <div className={`font-bold ${selectionStyles.primaryTextClass}`}>{profile.title}</div>
              <div className={`text-xs mt-1 ${selectionStyles.secondaryTextClass}`}>{profile.id}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StakeholderProfilesList;
