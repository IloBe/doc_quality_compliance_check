import Link from 'next/link';
import React from 'react';
import { LuBookOpen, LuFileCheck, LuShieldCheck } from 'react-icons/lu'; // LuBookOpen used as fallback icon below
import { ComplianceShortcut } from '../../lib/complianceStandards';

type ShortcutCardsProps = {
  shortcuts: ComplianceShortcut[];
};

const iconById: Record<string, React.ReactNode> = {
  'request-standard-mapping': <LuFileCheck className="w-5 h-5 text-blue-600" />,
  'open-sops': <LuShieldCheck className="w-5 h-5 text-blue-600" />,
};

const ShortcutCards = ({ shortcuts }: ShortcutCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {shortcuts.map((shortcut) => (
        <div key={shortcut.id} className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            {iconById[shortcut.id] ?? <LuBookOpen className="w-5 h-5 text-blue-600" />}
            <span className="font-bold text-blue-900 tracking-tight text-sm">{shortcut.title}</span>
          </div>

          <p className="text-xs text-blue-700/70 font-medium leading-relaxed mb-4">{shortcut.description}</p>

          {shortcut.href ? (
            <Link
              href={shortcut.href}
              className="inline-flex items-center justify-center w-full py-2 bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-blue-200 transition border border-blue-200"
            >
              {shortcut.actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="w-full py-2 bg-blue-100 text-blue-700 text-[11px] font-bold uppercase tracking-widest rounded-xl hover:bg-blue-200 transition border border-blue-200"
            >
              {shortcut.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ShortcutCards;
