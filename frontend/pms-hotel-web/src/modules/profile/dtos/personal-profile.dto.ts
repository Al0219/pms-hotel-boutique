export interface PersonalProfileFieldsDTO {
  firstName:string;lastName:string;phone:string|null;country:string|null;preferredLanguage:'es'|'en'|null;
  bedType:'KING'|'QUEEN'|'TWIN'|null;roomVibe:'QUIET'|'EXTERIOR_VIEW'|'NEAR_ELEVATOR'|null;floorPreference:'HIGH'|'LOW'|null;
}
export interface PersonalProfileDTO {
  guestAccountId:string;email:string;profile:(PersonalProfileFieldsDTO & {profileId:string;version:number;updatedAt:string})|null;
}
export interface SavePersonalProfileDTO extends PersonalProfileFieldsDTO {version:number;expectedUpdatedAt:string|null}
