
import React from 'react';
import { useMockStore } from '../lib/mockStore';
import { 
  LuHouse,
  LuShieldCheck,
  LuLayoutDashboard, 
  LuShuffle, 
  LuFlaskConical, 
  LuVault, 
  LuFiles, 
  LuFileText, 
  LuFileSpreadsheet, 
  LuShieldAlert, 
  LuHexagon, 
  LuHistory, 
  LuLibrary, 
  LuCircleHelp, 
  LuSettings,
  LuLogOut 
} from 'react-icons/lu';
import { useRouter } from 'next/router';

const NavItem = ({ href, icon: Icon, label, active }) => (
  <a
    href={href}
    className={`flex items-center gap-3 px-4 py-1 text-sm rounded transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-l-4 border-transparent'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-neutral-500'}`} />
    <span>{label}</span>
  </a>
);

const SectionLabel = ({ label }) => (
  <div className="px-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400 leading-none">
    {label}
  </div>
);

const Sidebar = ({ className }) => {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <aside className={`${className} flex flex-col pt-6 pb-4 overflow-y-auto`}>
      <div className="px-6 mb-8">
        <a href="/" className="flex items-center gap-2 text-blue-700 font-bold text-xl uppercase tracking-tighter hover:text-blue-800 transition-colors">
          <LuLibrary className="w-8 h-8" />
          <span>DocQuality</span>
        </a>
        <div className="mt-1 text-[10px] text-neutral-400 uppercase tracking-widest">
          Compliance & QA Lab
        </div>
      </div>

      <nav className="flex-grow">
        <div className="space-y-0">
          <NavItem href="/" icon={LuHouse} label="Home (Doc Hub)" active={currentPath === '/'} />
          <NavItem href="/compliance" icon={LuShieldCheck} label="Compliance Standards" active={currentPath === '/compliance'} />
        </div>

        <div className="mt-4">
          <SectionLabel label="Statistics" />
          <div className="space-y-0">
            <NavItem href="/dashboard" icon={LuLayoutDashboard} label="Dashboard" active={currentPath === '/dashboard'} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Pipeline" />
          <div className="space-y-0">
            <NavItem href="/bridge" icon={LuShuffle} label="Bridge" active={currentPath.startsWith('/bridge')} />
            <NavItem href="/artifact-lab" icon={LuFlaskConical} label="Artifact Lab" active={currentPath.startsWith('/artifact-lab')} />
            <NavItem href="/auditor-vault" icon={LuVault} label="Auditor Vault" active={currentPath.startsWith('/auditor-vault')} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Governance" />
          <div className="space-y-0">
            <NavItem href="/documents" icon={LuFiles} label="Documents" active={currentPath === '/documents'} />
            <NavItem href="/sops" icon={LuFileText} label="SOPs" active={currentPath === '/sops'} />
            <NavItem href="/forms" icon={LuFileSpreadsheet} label="Forms & Records" active={currentPath === '/forms'} />
            <NavItem href="/risk" icon={LuShieldAlert} label="Risk (FMEA/RMF)" active={currentPath.startsWith('/risk')} />
            <NavItem href="/architecture" icon={LuHexagon} label="Architecture (arc42)" active={currentPath === '/architecture'} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Reporting" />
          <div className="space-y-0">
            <NavItem href="/exports" icon={LuHistory} label="Exports Registry" active={currentPath === '/exports'} />
            <NavItem href="/audit-trail" icon={LuLibrary} label="Audit Trail" active={currentPath === '/audit-trail'} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Support" />
          <div className="space-y-0">
            <NavItem href="/help" icon={LuCircleHelp} label="Help & Snippets" active={currentPath === '/help'} />
            <NavItem href="/admin" icon={LuSettings} label="Admin" active={currentPath === '/admin'} />
          </div>
        </div>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-600 bg-neutral-50 rounded italic">
          <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-100 animate-pulse" />
          <span>SOTA Hub Phase 0</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
