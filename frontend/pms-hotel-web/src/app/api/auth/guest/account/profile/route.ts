import { NextRequest } from 'next/server';
import { personalProfileRequest } from '@/lib/bff/guest-personal-profile';
export const GET=(request:NextRequest)=>personalProfileRequest(request,'GET');
export const PUT=(request:NextRequest)=>personalProfileRequest(request,'PUT');
