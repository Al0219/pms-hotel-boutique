/** Closed HTTP inputs; untrusted responses are parsed before entering Domain. */
export type StayJourneyDto = unknown;
export interface JourneyPaymentDto { amount: string; currency: 'GTQ'; instrumentToken: string }
export interface JourneyRequestDto { kind: 'CHECK_IN' | 'CHECK_OUT'; expectedUpdatedAt: string }
