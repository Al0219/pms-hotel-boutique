import {expect,it} from 'vitest';
import {mapPersonalProfile,toPersonalProfileDTO} from './personal-profile.mapper';
import {emptyPersonalProfile,validatePersonalProfile} from '../model/personal-profile';
const account={guestAccountId:'own',email:'own@example.test',profile:null};
it('accepts absent personal profile without picking any historical profile',()=>{expect(mapPersonalProfile(account,'own').details).toBeNull();});
it('rejects another account and malformed required values',()=>{expect(()=>mapPersonalProfile(account,'other')).toThrow('PERSONAL_PROFILE_SCOPE_MISMATCH');});
it('normalizes optional fields, international phone and exact concurrency token without sending identity IDs',()=>{
 const baseline=mapPersonalProfile(account,'own');const body=toPersonalProfileDTO({...emptyPersonalProfile,firstName:' Demo ',lastName:' Guest ',phone:'+502 5555-5555',country:' Guatemala '},baseline);
 expect(body).toEqual({firstName:'Demo',lastName:'Guest',phone:'+50255555555',country:'Guatemala',preferredLanguage:null,bedType:null,roomVibe:null,floorPreference:null,version:0,expectedUpdatedAt:null});
 const dto={...account,profile:{...body,profileId:'personal',version:2,updatedAt:'2026-10-28T12:00:00.123456Z'}};
 const mapped=mapPersonalProfile(dto,'own');expect(toPersonalProfileDTO(mapped.details!.values,mapped).expectedUpdatedAt).toBe(dto.profile.updatedAt);
 expect(()=>mapPersonalProfile({...dto,profile:{...dto.profile,version:-1}},'own')).toThrow('INVALID_PERSONAL_PROFILE');
});
it('validates required names, country bounds and phone without demanding optional data',()=>{
 expect(Object.keys(validatePersonalProfile(emptyPersonalProfile))).toEqual(['firstName','lastName']);
 expect(validatePersonalProfile({...emptyPersonalProfile,firstName:'Demo',lastName:'Guest'})).toEqual({});
 expect(validatePersonalProfile({...emptyPersonalProfile,firstName:'x'.repeat(81),phone:'12345',country:'x'.repeat(81)})).toHaveProperty('phone');
});
