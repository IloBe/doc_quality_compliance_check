
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import { AuthUser, fetchCurrentUser } from '../lib/authClient';
import { AuthProvider } from '../lib/authContext';
import '../styles/globals.css';

const AUTH_BOOTSTRAP_MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Pages that don't use the AppShell (public auth/recovery pages)
  const noShellPages = ['/login', '/forgot-access', '/reset-access'];
  const isNoShell = noShellPages.includes(router.pathname);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      if (isNoShell) {
        setIsCheckingAuth(false);
        return;
      }

      for (let attempt = 1; attempt <= AUTH_BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
        try {
          const user = await fetchCurrentUser();
          if (isMounted) {
            setCurrentUser(user);
            setIsCheckingAuth(false);
          }
          return;
        } catch {
          if (attempt < AUTH_BOOTSTRAP_MAX_ATTEMPTS) {
            await sleep(attempt * 100);
            continue;
          }

          if (isMounted) {
            setCurrentUser(null);
            setIsCheckingAuth(false);
            router.replace('/login');
          }
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isNoShell, router]);

  if (isNoShell) {
    return (
      <AuthProvider currentUser={null}>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Checking session...</div>;
  }

  if (!currentUser) {
    // Never return null — keeps screen blank while router.replace('/login') is in flight.
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Redirecting to login…</div>;
  }

  return (
    <AuthProvider currentUser={currentUser}>
      <AppShell currentUser={currentUser}>
        <Component {...pageProps} />
      </AppShell>
    </AuthProvider>
  );
}

export default MyApp;
