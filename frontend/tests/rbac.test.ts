/// <reference path="./vitest.d.ts" />

import { hasPermission } from '../lib/rbac';

describe('rbac behavior matrix', () => {
  it('grants expected capabilities by role', () => {
    expect(hasPermission({ roles: ['architect'] }, 'bridge.run')).toBe(true);
    expect(hasPermission({ roles: ['architect'] }, 'review.approve')).toBe(true);
    expect(hasPermission({ roles: ['architect'] }, 'doc.edit')).toBe(true);

    expect(hasPermission({ roles: ['auditor'] }, 'bridge.run')).toBe(true);
    expect(hasPermission({ roles: ['auditor'] }, 'review.approve')).toBe(true);
    expect(hasPermission({ roles: ['developer'] }, 'doc.edit')).toBe(true);
  });

  it('denies actions outside each role permission set', () => {
    expect(hasPermission({ roles: ['auditor'] }, 'doc.edit')).toBe(false);
    expect(hasPermission({ roles: ['developer'] }, 'bridge.run')).toBe(false);
    expect(hasPermission({ roles: ['developer'] }, 'review.approve')).toBe(false);
    expect(hasPermission({ roles: ['unknown_role'] }, 'bridge.run')).toBe(false);
    expect(hasPermission(undefined, 'bridge.run')).toBe(false);
  });

  it('supports both role string and role property fallback', () => {
    expect(hasPermission('qm_lead', 'bridge.run')).toBe(true);
    expect(hasPermission({ role: 'admin' }, 'review.approve')).toBe(true);
  });
});
