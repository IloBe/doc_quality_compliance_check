
import React from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Pages that don't use the AppShell (e.g., Login)
  const noShellPages = ['/login'];
  const isNoShell = noShellPages.includes(router.pathname);

  if (isNoShell) {
    return <Component {...pageProps} />;
  }

  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  );
}

export default MyApp;
