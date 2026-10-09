import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { setAuthToken } from '@/lib/http/interceptors';
import { writeStaffInventory } from './staff-inventory-write.service';
import type { StaffInventoryCommand } from '../model/staff-inventory-command';
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://untrusted.example/api'); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); setAuthToken('must-not-use'); });
afterEach(() => { setAuthToken(null); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each([
  { kind: 'create-room', roomTypeId: staffInventoryFixture().types[0].id, code: ' 102 ' },
  { kind: 'edit-room', id: staffInventoryFixture().rooms[0].id, code: '102' },
  { kind: 'create-type', code: 'FAM', name: 'Familiar' },
  { kind: 'edit-type', id: staffInventoryFixture().types[0].id, name: 'Nuevo nombre' },
] satisfies StaffInventoryCommand[])('sends only the approved $kind command to same-origin Staff cookies', async command => {
  fetchMock.mockResolvedValue(Response.json(staffInventoryFixture().rooms[0]));
  await writeStaffInventory(inventoryPropertyId, command);
  const [url, init] = fetchMock.mock.calls[0], parsed = new URL(String(url));
  expect(parsed.origin).toBe(window.location.origin); expect(parsed.searchParams.get('propertyId')).toBe(inventoryPropertyId);
  expect(parsed.pathname).toContain(command.kind.endsWith('room') ? '/api/staff/rooms' : '/api/staff/room-types');
  expect(init?.method).toBe(command.kind.startsWith('edit') ? 'PATCH' : 'POST');
  const data = { ...command } as Record<string, unknown>; delete data.kind; delete data.id;
  expect(JSON.parse(init?.body as string)).toEqual(data);
  expect(new Headers(init?.headers).get('authorization')).toBeNull();
});
it('refreshes once after a rejected 401 and never retries uncertain writes', async () => {
  const command = { kind: 'create-type' as const, code: 'NEW', name: 'New' };
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ refreshed: true })).mockResolvedValueOnce(Response.json(staffInventoryFixture().types[0]));
  await writeStaffInventory(inventoryPropertyId, command); expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(String(fetchMock.mock.calls[1][0])).toContain('/api/auth/staff/refresh');
  for (const status of [400, 403, 404, 409, 503]) { fetchMock.mockReset(); fetchMock.mockResolvedValueOnce(new Response(null, { status })); await expect(writeStaffInventory(inventoryPropertyId, command)).rejects.toMatchObject({ status }); expect(fetchMock).toHaveBeenCalledTimes(1); }
  fetchMock.mockReset(); fetchMock.mockRejectedValueOnce(new Error('offline')); await expect(writeStaffInventory(inventoryPropertyId, command)).rejects.toThrow(); expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('never sends provisional metadata or writes when the mock gate is on', async () => {
  await expect(writeStaffInventory(inventoryPropertyId, { kind: 'create-type', code: 'NEW', name: 'New', presentation: {} } as unknown as StaffInventoryCommand)).rejects.toThrow('UNSUPPORTED_INVENTORY_FIELD');
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); await expect(writeStaffInventory(inventoryPropertyId, { kind: 'create-type', code: 'NEW', name: 'New' })).rejects.toThrow('REAL_INVENTORY_REQUIRES_MOCKS_FALSE'); expect(fetchMock).not.toHaveBeenCalled();
});
