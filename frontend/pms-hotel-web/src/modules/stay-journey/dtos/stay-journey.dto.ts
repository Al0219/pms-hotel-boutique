/** Untrusted HTTP responses are validated by the mapper before entering Domain/UI. */
export type JourneyResponseDto = unknown;
export interface SimulatedPaymentInputDto { amount: string; currency: 'GTQ'; instrumentToken: string }
