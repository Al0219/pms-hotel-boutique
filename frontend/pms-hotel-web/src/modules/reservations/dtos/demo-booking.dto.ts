import type { PaymentGuaranteeResponseDto } from '@/modules/payments';
/** PROVISIONAL MSW ONLY CONTRACT. Never sent to a real Backend. No PAN/CVV. */
export interface DemoBookingConfirmationDTO {
  reservation_id: string; property_id: string; arrival: string; departure: string; status: 'CONFIRMED'; confirmed_at: string;
  total_minor: number; guarantee_minor: number; remaining_minor: number; currency: string;
  stays: { stay_id: string; room_type_id: string; rate_plan_id: string; room_name: string }[];
  guarantee: PaymentGuaranteeResponseDto;
}
