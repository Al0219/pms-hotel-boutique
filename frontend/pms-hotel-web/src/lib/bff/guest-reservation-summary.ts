import {NextRequest,NextResponse} from 'next/server';
import {backendGuestRequest,guestAccessCookie} from './guest-auth';
import {reservationSummaryProjection} from './reservation-lookup';
const headers={'Cache-Control':'private, no-store'};
export async function guestReservationSummary(request:NextRequest,reservationId:string){
  const token=request.cookies.get(guestAccessCookie)?.value;
  const fail=(status:number)=>NextResponse.json({error:'GUEST_RESERVATION_UNAVAILABLE'},{status,headers});
  if(!token)return fail(401);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationId))return fail(400);
  try{const upstream=await backendGuestRequest('/api/v1/guest-auth/account/reservations/'+reservationId+'/summary',{method:'GET',headers:{authorization:'Bearer '+token},signal:request.signal});
    if(!upstream.ok)return fail([401,404].includes(upstream.status)?upstream.status:503);
    const data=await upstream.json();if(!Array.isArray(data.stays)||!data.stays.length||data.stays.some((row:{reservationId:string})=>row.reservationId!==reservationId)||!Array.isArray(data.details)||!Array.isArray(data.accommodations)||!data.overview)return fail(503);
    return NextResponse.json(reservationSummaryProjection(data),{headers});
  }catch{return fail(503);}
}
