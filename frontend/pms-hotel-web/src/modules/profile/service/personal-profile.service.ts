import {httpRequest} from '@/lib/http/client';
import type {PersonalProfileDTO,SavePersonalProfileDTO} from '../dtos/personal-profile.dto';
function endpoint(){return new URL('/api/auth/guest/account/profile',window.location.origin).href;}
export const readPersonalProfile=(signal?:AbortSignal)=>httpRequest<PersonalProfileDTO>({path:endpoint(),withAuth:false,signal});
export const savePersonalProfile=(body:SavePersonalProfileDTO)=>httpRequest<PersonalProfileDTO>({path:endpoint(),method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),withAuth:false});
