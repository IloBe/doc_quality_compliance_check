
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import AppErrorBoundary from '../components/AppErrorBoundary';
import { AuthUser, fetchCurrentUser } from '../lib/authClient';
import { AuthProvider } from '../lib/authContext';
import '../styles/globals.css';

const AUTH_BOOTSTRAP_MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isSafeInternalPath = (value: string) => value.startsWith('/') && !value.startsWith('//') && !value.includes('://');

const getReturnToPath = (path: string) => {
  if (isSafeInternalPath(path)) {
    return path;
  }
  return '/';
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRouteChanging, setIsRouteChanging] = useState(false);

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
            const returnTo = getReturnToPath(router.asPath || '/');
            const query = returnTo === '/' ? {} : { returnTo };
            void router.replace({ pathname: '/login', query }, undefined, { shallow: true });
          }
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isNoShell, router]);

  useEffect(() => {
    const handleRouteStart = () => setIsRouteChanging(true);
    const handleRouteSettled = () => setIsRouteChanging(false);

    router.events.on('routeChangeStart', handleRouteStart);
    router.events.on('routeChangeComplete', handleRouteSettled);
    router.events.on('routeChangeError', handleRouteSettled);

    return () => {
      router.events.off('routeChangeStart', handleRouteStart);
      router.events.off('routeChangeComplete', handleRouteSettled);
      router.events.off('routeChangeError', handleRouteSettled);
    };
  }, [router.events]);

  if (isNoShell) {
    return (
      <AuthProvider currentUser={null}>
        <AppErrorBoundary>
          <Component {...pageProps} />
        </AppErrorBoundary>
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
      <AppErrorBoundary>
        <AppShell currentUser={currentUser}>
          {isRouteChanging ? (
            <div className="min-h-[40vh] flex items-center justify-center text-sm font-semibold text-neutral-500">
              Loading page...
            </div>
          ) : (
            <Component {...pageProps} />
          )}
        </AppShell>
      </AppErrorBoundary>
    </AuthProvider>
  );
}

export default MyApp;
