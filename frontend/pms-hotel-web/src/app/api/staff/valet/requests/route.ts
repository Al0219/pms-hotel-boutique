import {NextRequest,NextResponse} from 'next/server';
import {backendStaffRequest,staffAccessCookie} from '@/lib/bff/staff-auth';
import {projectPersistedValet} from '@/modules/parking-valet';
const headers={'cache-control':'private, no-store'};
export async function GET(request:NextRequest){
 const fail=(status:number)=>NextResponse.json({error:'Valet unavailable'},{status,headers});
 const token=request.cookies.get(staffAccessCookie)?.value;if(!token)return fail(401);
 const property=request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
 if(!property||!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(property)||request.nextUrl.searchParams.size!==1)return fail(400);
 try{const response=await backendStaffRequest(`/api/v1/properties/${property}/service-requests/valet`,{headers:{authorization:`Bearer ${token}`},signal:request.signal});
 if(response.status!==200)return fail([400,401,403].includes(response.status)?response.status:503);
 return NextResponse.json(projectPersistedValet(await response.json(),property),{headers});}catch{return fail(503);}
}
