import React, { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { requestPasswordRecovery } from '../lib/authClient';

const DEFAULT_RECOVERY_EMAIL = 'demo@quality-station.ai';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

const ForgotAccessPage = () => {
  const router = useRouter();
  const requestSequenceRef = useRef(0);

  const email = useMemo(() => {
    const queryEmail = readQueryValue(router.query.email).trim();
    return queryEmail || DEFAULT_RECOVERY_EMAIL;
  }, [router.query.email]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commitEmail = useCallback((nextEmail: string) => {
    if (!router.isReady) {
      return;
    }

    const nextValue = nextEmail.trim();
    const currentValue = readQueryValue(router.query.email).trim();
    const normalizedCurrent = currentValue || DEFAULT_RECOVERY_EMAIL;
    const normalizedNext = nextValue || DEFAULT_RECOVERY_EMAIL;
    if (normalizedCurrent === normalizedNext) {
      return;
    }

    const nextQuery: Record<string, string> = {};
    Object.entries(router.query).forEach(([key, rawValue]) => {
      if (key === 'email') {
        return;
      }
      const normalized = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (normalized) {
        nextQuery[key] = normalized;
      }
    });

    if (normalizedNext !== DEFAULT_RECOVERY_EMAIL) {
      nextQuery.email = normalizedNext;
    }

    void router.replace(
      { pathname: router.pathname, query: nextQuery },
      undefined,
      { shallow: true, scroll: false },
    );
  }, [router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    const submittedEmail = email.trim();

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setDebugLink(null);

    try {
      const response = await requestPasswordRecovery(submittedEmail);
      if (requestSequenceRef.current !== requestId) {
        return;
      }
      setMessage(response.message);
      if (response.reset_url) {
        setDebugLink(response.reset_url);
      }
    } catch (err) {
      if (requestSequenceRef.current !== requestId) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Recovery request failed');
    } finally {
      if (requestSequenceRef.current === requestId) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-neutral-100 shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-black tracking-tight">Recover Access</h1>
        <p className="text-sm text-neutral-500">
          Enter your work email. If an account exists, a recovery link will be generated.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => commitEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-xs uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Generating link...' : 'Send Recovery Link'}
          </button>
        </form>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {debugLink && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 break-all">
            Dev-mode recovery link: <a href={debugLink} className="underline">{debugLink}</a>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="text-sm text-neutral-500">
          Back to <Link href="/login" className="text-blue-600 underline">login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotAccessPage;
