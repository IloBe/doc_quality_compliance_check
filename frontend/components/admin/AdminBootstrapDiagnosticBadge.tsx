import React, { useEffect, useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuLoader } from 'react-icons/lu';
import { BootstrapSelfCheckResponse, fetchBootstrapSelfCheck } from '../../lib/authClient';

type BadgeState = 'loading' | 'healthy' | 'warning' | 'unavailable';

const badgeClassByState: Record<BadgeState, string> = {
  loading: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  unavailable: 'bg-rose-50 text-rose-800 border-rose-200',
};

/**
 * Admin-only diagnostic badge for bootstrap auth configuration visibility.
 * Non-blocking by design: endpoint errors are rendered as badge states.
 */
const AdminBootstrapDiagnosticBadge = () => {
  const [state, setState] = useState<BadgeState>('loading');
  const [label, setLabel] = useState('Checking auth bootstrap...');
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setState('loading');
      setLabel('Checking auth bootstrap...');
      setDetails(null);

      try {
        const payload: BootstrapSelfCheckResponse = await fetchBootstrapSelfCheck();
        if (!active) {
          return;
        }

        const adminAccount = payload.accounts.find((account) => account.roles.includes('app_admin'));
        if (!payload.auto_provision_enabled) {
          setState('warning');
          setLabel('Auth bootstrap disabled');
          setDetails('AUTH_AUTO_PROVISION_MVP_USER is disabled.');
          return;
        }

        if (!adminAccount) {
          setState('warning');
          setLabel('No admin bootstrap account');
          setDetails('Configure AUTH_ADMIN_EMAIL and AUTH_ADMIN_ROLES with app_admin.');
          return;
        }

        setState('healthy');
        setLabel('Auth bootstrap healthy');
        setDetails(`${payload.account_count} account(s) configured, admin login active.`);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Bootstrap diagnostic unavailable';
        if (/forbidden|insufficient|unauthorized|authentication/i.test(message)) {
          setState('warning');
          setLabel('Auth diagnostic restricted');
          setDetails('Visible for app_admin or qm_lead sessions.');
          return;
        }

        setState('unavailable');
        setLabel('Auth diagnostic unavailable');
        setDetails(message);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${badgeClassByState[state]}`}>
      <div className="inline-flex items-center gap-2">
        {state === 'loading' ? <LuLoader className="w-4 h-4 animate-spin" /> : null}
        {state === 'healthy' ? <LuCircleCheck className="w-4 h-4" /> : null}
        {state === 'warning' || state === 'unavailable' ? <LuCircleAlert className="w-4 h-4" /> : null}
        <span>{label}</span>
      </div>
      {details ? <div className="mt-1 opacity-90">{details}</div> : null}
    </div>
  );
};

export default AdminBootstrapDiagnosticBadge;
