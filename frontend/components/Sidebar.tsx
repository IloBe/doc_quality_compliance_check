import Link from 'next/link';

import React, { useEffect, useState } from 'react';
import { useMockStore } from '../lib/mockStore';
import { fetchActiveModelStatus } from '../lib/modelPolicyClient';
import { 
  LuHouse,
  LuShieldCheck,
  LuLayoutDashboard, 
  LuShuffle, 
  LuFlaskConical, 
  LuVault, 
  LuFileText, 
  LuFileSpreadsheet, 
  LuShieldAlert, 
  LuHexagon, 
  LuHistory, 
  LuLibrary, 
  LuCircleHelp, 
  LuSettings,
  LuActivity,
  LuUsers,
  LuLogOut,
  LuFileQuestion,
  LuBookOpen
} from 'react-icons/lu';
import { formatDateTime } from '../lib/dateTime';
import { useRouter } from 'next/router';

const NavItem = ({ href, icon: Icon, label, active }) => (
  <Link
    href={href}
    className={`flex items-center gap-3 px-4 py-1 text-sm rounded transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' 
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-l-4 border-transparent'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-neutral-500'}`} />
    <span>{label}</span>
  </Link>
);

const SubNavItem = ({ href, icon: Icon, label, active }) => (
  <Link
    href={href}
    className={`ml-9 mt-1 flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
      active
        ? 'bg-blue-50 text-blue-700 font-semibold'
        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
    }`}
  >
    <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-700' : 'text-neutral-400'}`} />
    <span>{label}</span>
  </Link>
);

const SectionLabel = ({ label }) => (
  <div className="px-4 mb-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400 leading-none">
    {label}
  </div>
);

const Sidebar = ({ className }) => {
  const router = useRouter();
  const currentPath = router.pathname;
  const adminActive = currentPath.startsWith('/admin');
  const helpActive = currentPath.startsWith('/help');
  const [activeModelLabel, setActiveModelLabel] = useState('Llama 3.1 8B');
  const [activeModelProvider, setActiveModelProvider] = useState('OLLAMA');
  const [activeModelParams, setActiveModelParams] = useState('T=0.2 P=0.9 K=40');

  useEffect(() => {
    let mounted = true;
    const loadActiveModel = async () => {
      const status = await fetchActiveModelStatus();
      if (!mounted) {
        return;
      }
      const model = status.active_model;
      setActiveModelLabel(model.display_name || model.model_id || 'Llama 3.1 8B');
      setActiveModelProvider((model.provider || 'ollama').toUpperCase());
      setActiveModelParams(`T=${model.params?.temperature ?? 0.2} P=${model.params?.top_p ?? 0.9} K=${model.params?.top_k ?? 40}`);
    };

    loadActiveModel();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside className={`${className} flex flex-col pt-6 pb-4 overflow-y-auto`}>
      <div className="px-6 mb-8">
        <Link href="/" className="flex items-center gap-2 text-blue-700 font-bold text-xl uppercase tracking-tighter hover:text-blue-800 transition-colors">
          <LuLibrary className="w-8 h-8" />
          <span>DocQuality</span>
        </Link>
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
            <NavItem href="/sops" icon={LuFileText} label="SOPs" active={currentPath === '/sops'} />
            <NavItem href="/risk" icon={LuShieldAlert} label="Risk (FMEA/RMF)" active={currentPath.startsWith('/risk')} />
            <NavItem href="/architecture" icon={LuHexagon} label="Architecture (arc42)" active={currentPath === '/architecture'} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Reporting" />
          <div className="space-y-0">
            <NavItem href="/exports" icon={LuHistory} label="Exports Registry" active={currentPath === '/exports'} />
            <NavItem href="/audit-trail" icon={LuLibrary} label="Audit Trail" active={currentPath === '/audit-trail'} />
            <NavItem href="/auditor-workstation" icon={LuShieldAlert} label="Auditor Workstation" active={currentPath === '/auditor-workstation'} />
          </div>
        </div>

        <div className="mt-4">
          <SectionLabel label="Support" />
          <div className="space-y-0">
            <NavItem href="/help" icon={LuCircleHelp} label="Help & Snippets" active={helpActive} />
            <SubNavItem href="/help/qa" icon={LuFileQuestion} label="Q&A" active={currentPath === '/help/qa'} />
            <SubNavItem href="/help/glossary" icon={LuBookOpen} label="Glossary" active={currentPath === '/help/glossary'} />
            <NavItem href="/admin" icon={LuSettings} label="Admin" active={adminActive} />
            <SubNavItem href="/admin/observability" icon={LuActivity} label="Observability" active={currentPath === '/admin/observability'} />
            <SubNavItem href="/admin/stakeholders" icon={LuUsers} label="Stakeholders & Rights" active={currentPath === '/admin/stakeholders'} />
            <SubNavItem href="/admin/governance" icon={LuShieldCheck} label="Compliance Controls" active={currentPath === '/admin/governance'} />
          </div>
        </div>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-neutral-100 space-y-3">
        <div className="px-3 py-2 text-xs bg-amber-50 border border-amber-200 rounded text-neutral-700 space-y-1">
          <p className="font-semibold text-amber-900">⚠️ AI-Assisted Tool</p>
          <p className="leading-tight">
            This application uses AI to assist document analysis and compliance checking. 
            <strong> Results should be verified by qualified human experts.</strong> AI systems have limitations 
            and may produce errors. Users remain fully responsible for all decisions and outputs.
          </p>
          <p className="leading-tight border-t border-amber-200 pt-1 text-[11px] text-amber-900">
            AI model disclaimer: {activeModelLabel} ({activeModelProvider}) {activeModelParams}
          </p>
        </div>

        <div className="px-3 py-1.5 text-xs text-neutral-500 border-t border-neutral-200 pt-2">
          <p className="text-center">Last accessed: <strong>{formatDateTime(new Date())}</strong></p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

