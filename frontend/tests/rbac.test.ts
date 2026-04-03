/// <reference path="./vitest.d.ts" />

import { hasPermission } from '../lib/rbac';

describe('rbac bridge permissions', () => {
  it('allows architect to run bridge and submit reviews', () => {
    const architectUser = {
      email: 'arch@example.invalid',
      roles: ['architect'],
      org: 'qm',
    };

    expect(hasPermission(architectUser, 'bridge.run')).toBe(true);
    expect(hasPermission(architectUser, 'review.approve')).toBe(true);
  });

  it('keeps auditor bridge access enabled', () => {
    const auditorUser = {
      email: 'auditor@example.invalid',
      roles: ['auditor'],
      org: 'qm',
    };

    expect(hasPermission(auditorUser, 'bridge.run')).toBe(true);
    expect(hasPermission(auditorUser, 'review.approve')).toBe(true);
  });
});
