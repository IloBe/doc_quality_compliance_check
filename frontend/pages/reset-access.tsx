import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { resetPasswordWithToken, verifyRecoveryToken } from '../lib/authClient';

function readQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

const ResetAccessPage = () => {
  const router = useRouter();
  const verifySequenceRef = useRef(0);
  const resetSequenceRef = useRef(0);

  const token = useMemo(() => {
    return readQueryValue(router.query.token);
  }, [router.query.token]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyRequestId = verifySequenceRef.current + 1;
    verifySequenceRef.current = verifyRequestId;

    const tokenSnapshot = token;

    const verify = async () => {
      if (!tokenSnapshot) {
        if (verifySequenceRef.current === verifyRequestId) {
          setIsChecking(false);
        }
        return;
      }

      try {
        const result = await verifyRecoveryToken(tokenSnapshot);
        if (verifySequenceRef.current === verifyRequestId && token === tokenSnapshot) {
          setIsValidToken(result.valid);
          setIsChecking(false);
        }
      } catch {
        if (verifySequenceRef.current === verifyRequestId && token === tokenSnapshot) {
          setIsValidToken(false);
          setIsChecking(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      setIsChecking(true);
      setIsValidToken(false);
      setError(null);
      setMessage(null);
      setNewPassword('');
      setConfirmPassword('');
      void verify();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      verifySequenceRef.current += 1;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isChecking || !isValidToken || !token) {
      setError('Recovery token is invalid or expired.');
      return;
    }

    const resetRequestId = resetSequenceRef.current + 1;
    resetSequenceRef.current = resetRequestId;
    const tokenSnapshot = token;

    setError(null);
    setMessage(null);

    if (newPassword.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithToken(tokenSnapshot, newPassword);
      if (resetSequenceRef.current !== resetRequestId || tokenSnapshot !== token) {
        return;
      }
      setMessage(result.message);
    } catch (err) {
      if (resetSequenceRef.current !== resetRequestId || tokenSnapshot !== token) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      if (resetSequenceRef.current === resetRequestId) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-neutral-100 shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-black tracking-tight">Reset Access</h1>

        {isChecking ? (
          <p className="text-sm text-neutral-500">Validating recovery token...</p>
        ) : !isValidToken ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Recovery token is invalid or expired.
            </div>
            <Link href="/forgot-access" className="text-blue-600 underline text-sm">Request a new recovery link</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-blue-400"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-xs uppercase tracking-[0.16em] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Resetting password...' : 'Reset Password'}
            </button>
          </form>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message} <Link href="/login" className="underline">Go to login</Link>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetAccessPage;
