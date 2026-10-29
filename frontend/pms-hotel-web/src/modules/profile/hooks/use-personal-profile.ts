'use client';
import {useEffect,useRef} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {useGuestSession,refreshGuestSession} from '@/modules/auth';
import {HttpStatusError} from '@/lib/http/errors';
import {readPersonalProfile,savePersonalProfile} from '../service/personal-profile.service';
import {mapPersonalProfile,toPersonalProfileDTO} from '../mappers/personal-profile.mapper';
import type {PersonalProfile,PersonalProfileValues} from '../model/personal-profile';
export function usePersonalProfile(){
  const {account,status,retrySession}=useGuestSession();const client=useQueryClient();const current=useRef(account?.id);
  useEffect(()=>{current.current=account?.id;return()=>{current.current=undefined;};},[account?.id]);
  const queryKey=['guest','personal-profile',account?.id];
  async function request<T>(action:()=>Promise<T>):Promise<T>{
    try{return await action();}catch(error){if(!(error instanceof HttpStatusError) || error.status!==401)throw error;
      try{await refreshGuestSession();return await action();}catch(retry){if(retry instanceof HttpStatusError && retry.status===401)retrySession();throw retry;}}
  }
  const query=useQuery({queryKey,enabled:Boolean(account)&&status==='signed-in',retry:false,refetchOnWindowFocus:false,queryFn:async({signal})=>mapPersonalProfile(await request(()=>readPersonalProfile(signal)),account!.id)});
  const mutation=useMutation({mutationFn:async({values,baseline}:{values:PersonalProfileValues;baseline:PersonalProfile})=>{
    if(!account || status!=='signed-in' || baseline.accountId!==account.id)throw new Error('PERSONAL_PROFILE_SCOPE_REQUIRED');
    const save=()=>{
      // A refreshed session must never replay a draft after logout/account switch.
      if(current.current!==baseline.accountId)throw new Error('PERSONAL_PROFILE_SESSION_CHANGED');
      return savePersonalProfile(toPersonalProfileDTO(values,baseline));
    };
    return mapPersonalProfile(await request(save),account.id);
  },onSuccess:profile=>{if(current.current!==profile.accountId)return;client.setQueryData(queryKey,profile);void client.invalidateQueries({queryKey:['guest','account-summary',profile.accountId]});}});
  return {...query,mutation};
}
