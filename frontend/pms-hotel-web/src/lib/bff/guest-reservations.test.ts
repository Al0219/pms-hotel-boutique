import { NextRequest } from 'next/server';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const id='11111111-1111-4111-8111-111111111111', stay='22222222-2222-4222-8222-222222222222';
const row={ reservationId:id,stayId:stay,confirmationCode:'REAL-REFERENCE',propertyName:'Persisted Hotel',reservationStatus:'CONFIRMED',arrival:'2036-01-01',departure:'2036-01-03',roomCode:null,status:'RESERVED' };
beforeEach(()=>{vi.resetModules();vi.stubEnv('PMS_BACKEND_INTERNAL_URL','http://backend:8080');vi.stubEnv('PMS_WEB_PUBLIC_URL','http://localhost:3001');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
function request(method='GET',cookie='pms_guest_access=synthetic; pms_staff_access=staff',origin='http://localhost:3001') {
 return new NextRequest('http://localhost:3001/api/auth/guest/account/reservations?accountId=forged', {method,headers:{Cookie:cookie,Origin:origin,Authorization:'Bearer forged'}});
}
it('requires Guest cookies and ignores client identity and Staff credentials',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch');const {guestReservationsRequest}=await import('./guest-reservations');
 expect((await guestReservationsRequest(request('GET','pms_staff_access=staff'),'list')).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
});
it('allowlists persisted list fields and never forwards arbitrary accountId or tokens',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json([{...row,email:'private',accessToken:'private'}]));
 const {guestReservationsRequest}=await import('./guest-reservations');const response=await guestReservationsRequest(request(),'list');
 expect(response.status).toBe(200);expect(await response.json()).toEqual([row]);expect(response.headers.get('cache-control')).toContain('no-store');
 expect(fetch.mock.calls[0][0]).toBe('http://backend:8080/api/v1/guest-auth/account/reservations');
 expect(new Headers(fetch.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer synthetic');
});
it('recovery is same-origin, own-account and has no body',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(null,{status:204}));
 const {guestReservationsRequest}=await import('./guest-reservations');
 expect((await guestReservationsRequest(request('POST',undefined,'https://other.test'),'reconcile')).status).toBe(403);expect(fetch).not.toHaveBeenCalled();
 expect((await guestReservationsRequest(request('POST'),'reconcile')).status).toBe(204);expect(fetch.mock.calls[0][1]?.body).toBeUndefined();
});
it('detail validates UUIDs, ownership identity and allowlists nested data',async()=>{
 const detail={id:stay,reservationId:id,roomType:{id:'type',name:'Persisted type'},room:null,arrival:row.arrival,departure:row.departure,status:'RESERVED'};
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({...detail,bookingGuest:'private'}));
 const {guestReservationsRequest}=await import('./guest-reservations');
 expect((await guestReservationsRequest(request(),'stay',{reservationId:'invalid',stayId:stay})).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
 const response=await guestReservationsRequest(request(),'stay',{reservationId:id,stayId:stay});expect(await response.json()).toEqual(detail);
 fetch.mockResolvedValueOnce(Response.json({...detail,reservationId:stay}));expect((await guestReservationsRequest(request(),'stay',{reservationId:id,stayId:stay})).status).toBe(503);
});
it.each([401,404,500])('sanitizes upstream %s without any mock fallback',async(status)=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({private:'secret'},{status}));const {guestReservationsRequest}=await import('./guest-reservations');
 const response=await guestReservationsRequest(request(),'list');expect(response.status).toBe(status===500?503:status);expect(await response.text()).not.toContain('secret');
});
