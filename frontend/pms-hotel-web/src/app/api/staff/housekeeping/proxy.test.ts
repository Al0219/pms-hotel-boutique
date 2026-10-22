import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/bff/staff-auth', () => ({backendStaffRequest:backend,staffAccessCookie:'pms_staff_access'}));
import { proxyHousekeeping } from './proxy';
const propertyId='22222222-2222-4222-8222-222222222222',roomId='33333333-3333-4333-8333-333333333333';
const room={propertyId,roomId,roomCode:'101',roomTypeId:'44444444-4444-4444-8444-444444444444',roomTypeName:'Deluxe',tracked:true,status:'DIRTY',dnd:false,updatedAt:'2035-01-01T12:00:00.123456Z'};
function request(method='GET',body?:unknown,params=`propertyId=${propertyId}`,extra:Record<string,string>={}) {
  return new NextRequest(`http://localhost:3001/api/staff/housekeeping/rooms?${params}`,{method,headers:{cookie:'pms_staff_access=staff-secret; pms_guest_access=guest-secret',origin:'http://localhost:3001','content-type':'application/json',...extra},...(body!==undefined ? {body:JSON.stringify(body)}:{})});
}
beforeEach(() => {backend.mockReset();vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');});
afterEach(() => vi.unstubAllEnvs());
it('uses only Staff cookie, explicit property and safe projected response',async () => {
  backend.mockResolvedValue(Response.json({propertyId,rooms:[{...room,secret:'hidden'}],accessToken:'hidden'}));
  const response=await proxyHousekeeping(request());expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');expect(await response.json()).toEqual({propertyId,rooms:[room]});
  expect(backend.mock.calls[0][0]).toBe(`/api/v1/properties/${propertyId}/housekeeping/rooms`);
  expect(backend.mock.calls[0][1].headers.authorization).toBe('Bearer staff-secret');
});
it('does not accept Guest cookie or client bearer as Staff authentication',async () => {
  expect((await proxyHousekeeping(request('GET',undefined,undefined,{cookie:'pms_guest_access=guest',authorization:'Bearer injected'}))).status).toBe(401);
  expect(backend).not.toHaveBeenCalled();
});
it('protects write origin and rejects forged actor and duplicate scopes',async () => {
  expect((await proxyHousekeeping(request('POST',{},undefined,{origin:'http://evil.test'}),roomId,'tracking')).status).toBe(403);
  expect((await proxyHousekeeping(request('POST',{actorId:roomId}),roomId,'tracking')).status).toBe(400);
  expect((await proxyHousekeeping(request('GET',undefined,`propertyId=${propertyId}&propertyId=${propertyId}`))).status).toBe(400);
  expect(backend).not.toHaveBeenCalled();
});
it('forwards tracking and preserves timestamp precision in mutations',async () => {
  backend.mockResolvedValueOnce(Response.json(room));expect((await proxyHousekeeping(request('POST',{}),roomId,'tracking')).status).toBe(200);
  const body={expectedStatus:'DIRTY',expectedUpdatedAt:room.updatedAt,toStatus:'CLEAN',reason:null};
  backend.mockResolvedValueOnce(Response.json({...room,status:'CLEAN'}));
  expect((await proxyHousekeeping(request('PUT',body),roomId,'status')).status).toBe(200);
  expect(JSON.parse(backend.mock.calls[1][1].body)).toEqual(body);
});
it.each([400,401,403,404,409,500])('preserves safe status %i without leaking upstream details',async status => {
  backend.mockResolvedValue(Response.json({password:'hidden'}, {status}));const response=await proxyHousekeeping(request());
  expect(response.status).toBe(status===500 ? 503:status);expect(JSON.stringify(await response.json())).not.toContain('hidden');
});
it('rejects foreign-property data and a false success response',async () => {
  backend.mockResolvedValueOnce(Response.json({...room,propertyId:'55555555-5555-4555-8555-555555555555'}));
  expect((await proxyHousekeeping(request(),roomId)).status).toBe(503);
  backend.mockResolvedValueOnce(Response.json(room));
  expect((await proxyHousekeeping(request('PUT',{expectedUpdatedAt:room.updatedAt,dnd:true}),roomId,'dnd')).status).toBe(503);
});
it('requires a reason for dirty and rejects non-JSON or malformed concurrency data',async () => {
  expect((await proxyHousekeeping(request('PUT',{expectedUpdatedAt:'bad',dnd:true}),roomId,'dnd')).status).toBe(400);
  expect((await proxyHousekeeping(request('PUT',{expectedStatus:'CLEAN',expectedUpdatedAt:room.updatedAt,toStatus:'DIRTY',reason:' '}),roomId,'status')).status).toBe(400);
  expect((await proxyHousekeeping(request('POST',{},undefined,{'content-type':'text/plain'}),roomId,'tracking')).status).toBe(400);
  expect(backend).not.toHaveBeenCalled();
});
