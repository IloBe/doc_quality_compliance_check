import type { NextRouter } from 'next/router';

type SyncQueryParamOptions = {
  omitWhenEmpty?: boolean;
  omitWhen?: (value: string) => boolean;
};

export function readFirstQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export function syncQueryParam(
  router: NextRouter,
  key: string,
  desiredValue: string,
  options?: SyncQueryParamOptions,
): void {
  if (!router.isReady) {
    return;
  }

  const currentValue = readFirstQueryValue(router.query[key]);

  const nextQuery: Record<string, string> = {};
  Object.entries(router.query).forEach(([entryKey, rawValue]) => {
    if (entryKey === key) {
      return;
    }
    const normalized = readFirstQueryValue(rawValue);
    if (normalized) {
      nextQuery[entryKey] = normalized;
    }
  });

  const omitWhenEmpty = options?.omitWhenEmpty ?? true;
  const omitWhen = options?.omitWhen;
  const shouldOmit = (omitWhenEmpty && !desiredValue) || (omitWhen ? omitWhen(desiredValue) : false);
  const effectiveDesiredValue = shouldOmit ? '' : desiredValue;

  if (currentValue === effectiveDesiredValue) {
    return;
  }

  if (!shouldOmit) {
    nextQuery[key] = desiredValue;
  }

  void router.replace(
    { pathname: router.pathname, query: nextQuery },
    undefined,
    { shallow: true, scroll: false },
  );
}
