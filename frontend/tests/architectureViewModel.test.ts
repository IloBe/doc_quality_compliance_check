/// <reference path="./vitest.d.ts" />

import { parseArc42Field } from '../lib/architectureViewModel';

describe('parseArc42Field', () => {
  it('removes literal html br tags from metadata field values', () => {
    const markdown = [
      '**Version:** 1.0<br>',
      '**Status:** Draft<br/>',
    ].join('\n');

    expect(parseArc42Field(markdown, 'Version')).toBe('1.0');
    expect(parseArc42Field(markdown, 'Status')).toBe('Draft');
  });

  it('returns undefined when no value remains after cleanup', () => {
    const markdown = '**Date:** _______________<br>';
    expect(parseArc42Field(markdown, 'Date')).toBeUndefined();
  });
});
