import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import type { PersonalProfileDTO,SavePersonalProfileDTO } from '../dtos/personal-profile.dto';
import type { PersonalProfile,PersonalProfileValues } from '../model/personal-profile';
import {validatePersonalProfile} from '../model/personal-profile';
const text=(v:unknown):v is string=>typeof v==='string' && Boolean(v.trim());
export function mapPersonalProfile(dto:PersonalProfileDTO,accountId:string):PersonalProfile {
  if(!dto || dto.guestAccountId!==accountId || !text(dto.email)) throw new DomainMappingError('PERSONAL_PROFILE_SCOPE_MISMATCH');
  const p=dto.profile;
  if(p===null) return {accountId,email:dto.email,details:null};
  if(!p || !text(p.profileId) || !text(p.firstName) || !text(p.lastName) || !Number.isSafeInteger(p.version) || p.version<1 || !text(p.updatedAt) || !/Z$/.test(p.updatedAt) || !Number.isFinite(Date.parse(p.updatedAt)) ||
    ![null,'es','en'].includes(p.preferredLanguage) || ![null,'KING','QUEEN','TWIN'].includes(p.bedType) || ![null,'QUIET','EXTERIOR_VIEW','NEAR_ELEVATOR'].includes(p.roomVibe) || ![null,'HIGH','LOW'].includes(p.floorPreference) ||
    ![p.phone,p.country].every(v=>v===null||typeof v==='string')) throw new DomainMappingError('INVALID_PERSONAL_PROFILE');
  const values:PersonalProfileValues={firstName:p.firstName,lastName:p.lastName,phone:p.phone??'',country:p.country??'',preferredLanguage:p.preferredLanguage??'',bedType:p.bedType??'',roomVibe:p.roomVibe??'',floorPreference:p.floorPreference??''};
  if(Object.keys(validatePersonalProfile(values)).length) throw new DomainMappingError('INVALID_PERSONAL_PROFILE');
  return {accountId,email:dto.email,details:{id:p.profileId,version:p.version,updatedAt:p.updatedAt,values}};
}
export function toPersonalProfileDTO(values:PersonalProfileValues,baseline:PersonalProfile):SavePersonalProfileDTO {
  if(Object.keys(validatePersonalProfile(values)).length) throw new DomainMappingError('INVALID_PERSONAL_PROFILE');
  return {firstName:values.firstName.trim(),lastName:values.lastName.trim(),phone:values.phone.replace(/[ ()-]/g,'')||null,country:values.country.trim()||null,
    preferredLanguage:values.preferredLanguage||null,bedType:values.bedType||null,roomVibe:values.roomVibe||null,floorPreference:values.floorPreference||null,version:baseline.details?.version??0,expectedUpdatedAt:baseline.details?.updatedAt??null};
}
