export interface PersonalProfileValues {
  firstName:string;lastName:string;phone:string;country:string;preferredLanguage:''|'es'|'en';
  bedType:''|'KING'|'QUEEN'|'TWIN';roomVibe:''|'QUIET'|'EXTERIOR_VIEW'|'NEAR_ELEVATOR';floorPreference:''|'HIGH'|'LOW';
}
export interface PersonalProfile {
  accountId:string;email:string;details:null|{id:string;values:PersonalProfileValues;version:number;updatedAt:string};
}
export const emptyPersonalProfile:PersonalProfileValues={firstName:'',lastName:'',phone:'',country:'',preferredLanguage:'',bedType:'',roomVibe:'',floorPreference:''};
export function validatePersonalProfile(values:PersonalProfileValues):Partial<Record<keyof PersonalProfileValues,string>> {
  const errors:Partial<Record<keyof PersonalProfileValues,string>>={};
  if(!values.firstName.trim() || values.firstName.trim().length>80) errors.firstName='Escribe tu nombre (máximo 80 caracteres).';
  if(!values.lastName.trim() || values.lastName.trim().length>80) errors.lastName='Escribe tus apellidos (máximo 80 caracteres).';
  if(values.phone.trim() && !/^\+[1-9][0-9]{7,14}$/.test(values.phone.replace(/[ ()-]/g,''))) errors.phone='Incluye el código de país y de 8 a 15 dígitos. Ej. +502 5555 5555.';
  if(values.country.trim().length>80) errors.country='Utiliza como máximo 80 caracteres.';
  return errors;
}
