/// <reference path="./vitest.d.ts" />

import { readFirstQueryValue, syncQueryParam } from '../lib/queryState';

describe('queryState helpers', () => {
  it('normalizes first query value from scalar, array, and undefined', () => {
    expect(readFirstQueryValue('alpha')).toBe('alpha');
    expect(readFirstQueryValue(['beta', 'gamma'])).toBe('beta');
    expect(readFirstQueryValue(undefined)).toBe('');
  });

  it('does not mutate router when not ready or when unchanged', () => {
    const replace = vi.fn();

    syncQueryParam(
      {
        isReady: false,
        query: { record: 'A' },
        pathname: '/risk',
        replace,
      } as any,
      'record',
      'B',
    );

    syncQueryParam(
      {
        isReady: true,
        query: { record: 'A' },
        pathname: '/risk',
        replace,
      } as any,
      'record',
      'A',
    );

    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces query with normalized keys and prunes selection when empty/default', () => {
    const replace = vi.fn();

    syncQueryParam(
      {
        isReady: true,
        query: { record: 'A', keep: ['x', 'y'], empty: '' },
        pathname: '/risk',
        replace,
      } as any,
      'record',
      '',
    );

    expect(replace).toHaveBeenCalledWith(
      {
        pathname: '/risk',
        query: { keep: 'x' },
      },
      undefined,
      { shallow: true, scroll: false },
    );
  });

  it('supports omitWhen for default-id cleanup and keeps desired value otherwise', () => {
    const replace = vi.fn();

    syncQueryParam(
      {
        isReady: true,
        query: { record: 'A', q: 'needle' },
        pathname: '/risk',
        replace,
      } as any,
      'record',
      'DEFAULT',
      { omitWhen: (value) => value === 'DEFAULT' },
    );

    syncQueryParam(
      {
        isReady: true,
        query: { record: 'A', q: 'needle' },
        pathname: '/risk',
        replace,
      } as any,
      'record',
      'B',
      { omitWhen: (value) => value === 'DEFAULT' },
    );

    expect(replace).toHaveBeenNthCalledWith(
      1,
      {
        pathname: '/risk',
        query: { q: 'needle' },
      },
      undefined,
      { shallow: true, scroll: false },
    );

    expect(replace).toHaveBeenNthCalledWith(
      2,
      {
        pathname: '/risk',
        query: { q: 'needle', record: 'B' },
      },
      undefined,
      { shallow: true, scroll: false },
    );
  });
});
