export type AppMode = 'real' | 'demo';

const DEFAULT_APP_MODE: AppMode = 'real';

function normalizeMode(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function resolveAppMode(rawValue: string | undefined): AppMode {
  const normalized = normalizeMode(rawValue);
  if (normalized === 'demo') {
    return 'demo';
  }
  if (normalized === 'real' || normalized === 'backend') {
    return 'real';
  }
  return DEFAULT_APP_MODE;
}

export function getAppMode(): AppMode {
  return resolveAppMode(process.env.NEXT_PUBLIC_APP_MODE);
}

export function isDemoMode(): boolean {
  return getAppMode() === 'demo';
}

export function isRealMode(): boolean {
  return getAppMode() === 'real';
}
