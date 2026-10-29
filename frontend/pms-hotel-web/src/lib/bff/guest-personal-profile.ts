import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest, guestAccessCookie } from './guest-auth';
const headers={ 'Cache-Control':'private, no-store' };
const editable=['firstName','lastName','phone','country','preferredLanguage','bedType','roomVibe','floorPreference','version','expectedUpdatedAt'];
const responseFields=['profileId','firstName','lastName','phone','country','preferredLanguage','bedType','roomVibe','floorPreference','version','updatedAt'];
function failure(status:number) { return NextResponse.json({error:'PERSONAL_PROFILE_UNAVAILABLE'},{status,headers}); }
async function closedBody(request:NextRequest) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('INVALID_BODY');
  const reader=request.body?.getReader();if(!reader) throw new Error('INVALID_BODY');
  const chunks:Uint8Array[]=[];let size=0;
  try { while(true) {const chunk=await reader.read();if(chunk.done) break;size+=chunk.value.byteLength;if(size>4096){await reader.cancel();throw new Error('INVALID_BODY');}chunks.push(chunk.value);} } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const data:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).some(k=>!editable.includes(k)) || editable.some(k=>!(k in data))) throw new Error('INVALID_BODY');
  return data;
}
export async function personalProfileRequest(request:NextRequest,method:'GET'|'PUT') {
  const token=request.cookies.get(guestAccessCookie)?.value;if(!token) return failure(401);
  let input;
  if(method==='PUT') {
    if(request.headers.get('origin')!==new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return failure(403);
    try {input=await closedBody(request);}catch{return failure(400);}
  }
  try {
    const upstream=await backendGuestRequest('/api/v1/guest-auth/account/profile',{method,headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},body:method==='PUT'?JSON.stringify(input):undefined,signal:request.signal});
    if(!upstream.ok) return failure([400,401,409].includes(upstream.status)?upstream.status:503);
    const data=await upstream.json();
    if(!data || typeof data.guestAccountId!=='string' || typeof data.email!=='string' || data.profile===undefined) return failure(503);
    const p=data.profile;
    if(p!==null && (!p || responseFields.some(key=>!(key in p)) || !Number.isSafeInteger(p.version) || p.version<1)) return failure(503);
    return NextResponse.json({guestAccountId:data.guestAccountId,email:data.email,profile:p===null?null:Object.fromEntries(responseFields.map(k=>[k,p[k]]))},{headers});
  }catch{return failure(503);}
}
