export interface JourneyRequest { id: string; kind: 'CHECK_IN' | 'CHECK_OUT'; status: 'OPEN' | 'DONE'; createdAt: string; completedAt: string | null }
export interface JourneyLine { id: string; kind: 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT'; description: string; amount: string; createdAt: string }
export interface JourneySummary {
  stay: { propertyId: string; reservationId: string; stayId: string; confirmationCode: string; status: string; updatedAt: string; roomId: string | null; arrival: string; departure: string; timezone: string };
  folioId: string; currency: 'GTQ'; balance: string; charges: string; payments: string; adjustments: string; verifiable: boolean; pendingOrders: number; unpostedOrders: number;
  movements: JourneyLine[]; requests: JourneyRequest[]; documentId: string | null; disclaimer: string;
}
export interface JourneyDocument { id: string; issuedAt: string; snapshot: JourneySummary }
export interface SimulatedPaymentInput { amount: string; currency: 'GTQ'; instrumentToken: string }
export interface SimulatedPaymentReceipt { operationId: string; folioId: string; result: 'APPROVED' | 'DECLINED' | 'ERROR'; amount: string; currency: 'GTQ'; movementId: string | null; completedAt: string }
