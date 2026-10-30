import {filterLinkedReservations, validFilterDate} from '@/modules/guest-auth/domain/filterLinkedReservations';
import type {LinkedReservationSummary} from '@/modules/guest-auth/domain/models/LinkedReservationSummary';
const row = (id: string, statusLabel: string, arrival: string, departure = '2026-11-05'): LinkedReservationSummary => ({reservationId: id, reservationStayId: id, reference: id, propertyLabel: 'Hotel Boutique Démo', statusLabel, arrival, departure});
const rows = [row('pending-late','RESERVED','2026-11-03'), row('closed','CHECKED_OUT','2026-10-20','2026-10-22'), row('active-late','IN_HOUSE','2026-10-29'), row('pending-early','RESERVED','2026-10-31'), row('active-early','IN_HOUSE','2026-10-28'), row('cancelled','CANCELLED','2026-10-10','2026-10-12')];
it('defaults to current stays, IN_HOUSE first, dates ascending without mutating source',()=>{
 expect(filterLinkedReservations(rows).map(r=>r.reference)).toEqual(['active-early','active-late','pending-early','pending-late']);expect(rows[0].reference).toBe('pending-late');
});
it('requires explicit history and combines normalized names, dates and inclusive range',()=>{
 expect(filterLinkedReservations(rows,'HISTORY').map(r=>r.reference)).toEqual(['cancelled','closed']);
 expect(filterLinkedReservations(rows,'IN_HOUSE','demo','2026-11-01','2026-11-02')).toHaveLength(2);
 expect(filterLinkedReservations(rows,'RESERVED','31/10/2026').map(r=>r.reference)).toEqual(['pending-early']);
 expect(filterLinkedReservations(rows,'RESERVED','2026-11-03').map(r=>r.reference)).toEqual(['pending-late']);
 expect(filterLinkedReservations(rows,'HISTORY','','2026-10-21','2026-10-23').map(r=>r.reference)).toEqual(['closed']);
 expect(filterLinkedReservations(rows,'CURRENT','otro hotel')).toEqual([]);
});
it('rejects invalid or reversed date ranges',()=>{
 expect(validFilterDate('2026-02-30')).toBe(false);expect(validFilterDate('2028-02-29')).toBe(true);
 expect(filterLinkedReservations(rows,'CURRENT','','2026-12-01','2026-11-01')).toEqual([]);
 expect(filterLinkedReservations(rows,'CURRENT','','invalid','')).toEqual([]);
});
