import {environment} from '@/config/environment';
import {useHousekeepingRequests} from './useHousekeepingRequests';
import type {HousekeepingService} from '../../data/services/HousekeepingService';
import type {PersistedHousekeepingRequest} from '../../domain/PersistedHousekeepingRequest';
function useMockSchedules(){return{data:[] as PersistedHousekeepingRequest[],ready:true};}
function useHttpSchedules(service?:HousekeepingService){const q=useHousekeepingRequests(service);return{data:q.data??[],ready:q.isSuccess&&!q.isError};}
export const useHousekeepingScheduleRequests=environment.useMockApi?useMockSchedules:useHttpSchedules;
