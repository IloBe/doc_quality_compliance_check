import React, { useState } from 'react';
import Link from 'next/link';
import { requestPasswordRecovery } from '../lib/authClient';

const ForgotAccessPage = () => {
  const [email, setEmail] = useState('demo@quality-station.ai');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setDebugLink(null);

    try {
      const response = await requestPasswordRecovery(email);
      setMessage(response.message);
      if (response.reset_url) {
        setDebugLink(response.reset_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery request failed');
    } finally {
      setIsSubmitting(false);
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
              onChange={(e) => setEmail(e.target.value)}
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
