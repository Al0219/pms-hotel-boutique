import { describe, expect, it } from 'vitest';
import type { StaffSession } from '@/modules/auth';
import { allProperties, defaultStaffProperty, resolvePropertyScope } from './property-scope';
const membership = (propertyId: string, propertyCode: string | null, active = true) => ({ propertyId, propertyCode, active,
  name: propertyCode === 'HB-GT-DEMO' ? 'Hotel Boutique Demo' : 'Hotel autorizado', timezone: 'America/Guatemala', currency: 'GTQ' });
const session = (memberships: StaffSession['memberships'], permissions: string[] = []): StaffSession => ({
  id: 'staff-session', userName: 'Staff', roleId: 'RECEPCION', roleName: 'Recepción', permissions, memberships,
});
describe('authorized initial Staff property', () => {
  it('prefers Demo by its canonical code even when it is not first', () => {
    const staff = session([membership('first', 'OTHER'), membership('demo-session-id', 'HB-GT-DEMO')]);
    expect(defaultStaffProperty(staff)).toBe('demo-session-id');
    expect(resolvePropertyScope(staff, defaultStaffProperty(staff))).toEqual({ kind: 'PROPERTY', propertyIds: ['demo-session-id'] });
  });
  it('does not derive authorization from a matching name, public config or UUID', () => {
    const staff = session([membership('first', 'OTHER'), { ...membership('second', 'SECOND'), name: 'Hotel Boutique Demo' }]);
    expect(defaultStaffProperty(staff)).toBe('first');
    expect(resolvePropertyScope(staff, 'unauthorized-demo-id')).toBeNull();
  });
  it('skips inactive Demo and inactive first memberships, retaining authorized source order', () => {
    const staff = session([membership('inactive', 'HB-GT-DEMO', false), membership('z-first-active', null), membership('a-next', 'OTHER')]);
    expect(defaultStaffProperty(staff)).toBe('z-first-active');
  });
  it('leaves no default or scope when there are no active memberships', () => {
    for (const members of [[], [membership('demo', 'HB-GT-DEMO', false)]]) {
      const staff = session(members, ['MULTI_PROPERTY_READ']);
      expect(defaultStaffProperty(staff)).toBe('');
      expect(resolvePropertyScope(staff, '')).toBeNull();
      expect(resolvePropertyScope(staff, allProperties)).toBeNull();
    }
  });
  it('never chooses ALL_PROPERTIES as a default; manual aggregation still needs permission', () => {
    const staff = session([membership('first', 'OTHER'), membership('demo', 'HB-GT-DEMO')]);
    expect(resolvePropertyScope(staff, allProperties)).toBeNull();
    staff.permissions = ['MULTI_PROPERTY_READ'];
    expect(defaultStaffProperty(staff)).toBe('demo');
    expect(resolvePropertyScope(staff, allProperties)).toEqual({ kind: 'ALL_PROPERTIES', propertyIds: ['demo', 'first'] });
  });
});
