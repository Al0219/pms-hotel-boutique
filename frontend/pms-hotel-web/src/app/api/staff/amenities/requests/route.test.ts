import {NextRequest} from 'next/server';
import {beforeEach,expect,it,vi} from 'vitest';
const backend=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/bff/staff-auth',()=>({backendStaffRequest:backend,staffAccessCookie:'pms_staff_access'}));
import {GET} from './route';
import {PUT} from './[requestId]/status/route';
const propertyId='22222222-2222-4222-8222-222222222222',requestId='33333333-3333-4333-8333-333333333333';
const dto={id:requestId,propertyId,confirmationCode:'ROOMREAL01',roomCode:'204',serviceDate:'2030-01-02',deliveryTime:'09:00',notes:'Entregar en puerta',status:'OPEN',updatedAt:'2030-01-01T08:00:00Z',items:[{itemId:'44444444-4444-4444-8444-444444444444',itemName:'Kit dental',quantity:2}]};
const context={params:Promise.resolve({requestId})};
const body={expectedUpdatedAt:dto.updatedAt,targetStatus:'IN_PROGRESS'};
function request(method='GET',payload:unknown=body,cookie='pms_staff_access=synthetic-staff; pms_guest_access=synthetic-guest',origin='http://localhost:3001',query=`propertyId=${propertyId}`){return new NextRequest(`http://localhost:3001/api/staff/amenities/requests?${query}`,{method,headers:{cookie,origin,'content-type':'application/json'},...(method==='PUT'?{body:JSON.stringify(payload)}:{})});}
beforeEach(()=>{backend.mockReset();vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');});
it('reads only Staff cookies/property and projects products/prices with no-store',async()=>{
 backend.mockResolvedValue(Response.json([{...dto,secret:'hidden'}]));const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(await response.json()).toEqual([dto]);expect(backend.mock.calls[0][0]).toBe(`/api/v1/properties/${propertyId}/service-requests/amenities`);expect(backend.mock.calls[0][1].headers.authorization).toBe('Bearer synthetic-staff');
});
it('rejects Guest-only, malformed or duplicated property scope before Backend',async()=>{
 expect((await GET(request('GET',body,'pms_guest_access=synthetic-guest'))).status).toBe(401);expect((await GET(request('GET',body,undefined,undefined,'propertyId=foreign'))).status).toBe(400);expect((await GET(request('GET',body,undefined,undefined,`propertyId=${propertyId}&propertyId=${propertyId}`))).status).toBe(400);expect(backend).not.toHaveBeenCalled();
});
it('requires same origin and a closed transition body',async()=>{
 expect((await PUT(request('PUT',body,undefined,'https://attacker.test'),context)).status).toBe(403);expect((await PUT(request('PUT',{...body,price:1}),context)).status).toBe(400);expect((await PUT(request('PUT',{...body,targetStatus:'CANCELLED'}),context)).status).toBe(400);expect(backend).not.toHaveBeenCalled();
});
it('forwards status/version and validates the complete persisted acknowledgement',async()=>{
 const saved={...dto,status:'IN_PROGRESS',updatedAt:'2030-01-01T09:00:00Z'};backend.mockResolvedValue(Response.json({...saved,secret:'hidden'}));const response=await PUT(request('PUT'),context);expect(response.status).toBe(200);expect(await response.json()).toEqual(saved);expect(backend.mock.calls[0][1]).toMatchObject({method:'PUT',body:JSON.stringify(body)});
});
it.each([400,401,403,404,409,500])('returns safe transition error %i',async status=>{backend.mockResolvedValue(Response.json({secret:'hidden'},{status}));const response=await PUT(request('PUT'),context);expect(response.status).toBe(status===500?503:status);expect(JSON.stringify(await response.json())).not.toContain('hidden');});
it.each([{...dto,propertyId:'foreign'},{...dto,items:[{...dto.items[0],quantity:6}]},{...dto,status:'FAKE'}])('rejects foreign or inconsistent persisted data',async row=>{backend.mockResolvedValue(Response.json([row]));expect((await GET(request())).status).toBe(503);});
