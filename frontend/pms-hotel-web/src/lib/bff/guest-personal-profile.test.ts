import {beforeAll,beforeEach,afterEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const upstream=vi.fn<typeof fetch>();let api:typeof import('./guest-personal-profile');
beforeAll(async()=>{vi.resetModules();vi.stubEnv('PMS_BACKEND_INTERNAL_URL','http://backend:8080');api=await import('./guest-personal-profile');});
beforeEach(()=>{vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');vi.stubGlobal('fetch',upstream);upstream.mockReset();});afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
const body={firstName:'Demo',lastName:'Guest',phone:null,country:null,preferredLanguage:null,bedType:null,roomVibe:null,floorPreference:null,version:0,expectedUpdatedAt:null};
function req(method='GET',data:unknown=body,cookie='pms_guest_access=guest; pms_staff_access=staff',origin='http://localhost:3001'){return new NextRequest('http://localhost:3001/api/auth/guest/account/profile?accountId=other',{method,headers:{origin,cookie,'Content-Type':'application/json'},body:method==='GET'?undefined:typeof data==='string'?data:JSON.stringify(data)});}
it('uses only Guest credentials and omits client identifiers and secret upstream fields',async()=>{
 upstream.mockResolvedValue(Response.json({guestAccountId:'own',email:'own@example.test',profile:null,accessToken:'secret'}));const response=await api.personalProfileRequest(req(),'GET');expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(await response.text()).not.toContain('secret');const [url,init]=upstream.mock.calls[0];expect(url).toBe('http://backend:8080/api/v1/guest-auth/account/profile');expect(new Headers(init?.headers).get('authorization')).toBe('Bearer guest');expect(new Headers(init?.headers).get('cookie')).toBeNull();
});
it('rejects missing Guest token, hostile origin, oversized body and ownership fields',async()=>{
 expect((await api.personalProfileRequest(req('GET',body,'pms_staff_access=staff'),'GET')).status).toBe(401);
 expect((await api.personalProfileRequest(req('PUT',body,undefined,'http://evil.test'),'PUT')).status).toBe(403);
 for(const input of [{...body,guestAccountId:'other'},{...body,email:'other@example.test'},' '.repeat(4097),{},null])expect((await api.personalProfileRequest(req('PUT',input),'PUT')).status).toBe(400);expect(upstream).not.toHaveBeenCalled();
});
it.each([400,401,409,500])('preserves safe error %s without leaking upstream bodies',async status=>{upstream.mockResolvedValue(Response.json({secret:'never'},{status}));const response=await api.personalProfileRequest(req('PUT'),'PUT');expect(response.status).toBe(status===500?503:status);expect(await response.text()).not.toContain('never');});
