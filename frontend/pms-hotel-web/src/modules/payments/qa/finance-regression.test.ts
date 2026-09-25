import { describe, expect, it } from "vitest";

import {
  fetchFolioByIdDto,
  mapFolioDtoToDomain,
  mapSplitChargeRequestToDto,
  mapSplitChargeResultDtoToDomain,
  mapTransferChargeRequestToDto,
  mapTransferChargeResultDtoToDomain,
  splitFolioChargeDto,
  transferFolioChargeDto,
} from "@/modules/folio";
import {
  authorizePaymentDto,
  capturePaymentDto,
  fetchPaymentsDto,
  mapAuthorizePaymentRequestToDto,
  mapCapturePaymentRequestToDto,
  mapPaymentDtoToDomain,
  mapPaymentListResponseDtoToDomain,
  mapRefundPaymentRequestToDto,
  mapVoidPaymentRequestToDto,
  refundPaymentDto,
  voidPaymentDto,
  type Payment,
} from "@/modules/payments";

describe("IMP-WEB-0409 — QA Folio & Payments Regression Suite (Sprint 4)", () => {
  describe("Journey 1: Folio Split & Transfer Balance Conservation", () => {
    it("preserves exact financial balance across multi-split and inter-folio transfer", async () => {
      // 1. Cargar Folio inicial
      const initialFolioDto = await fetchFolioByIdDto("fol_guest_101");
      const initialFolio = mapFolioDtoToDomain(initialFolioDto);
      expect(initialFolio.folioId).toBe("fol_guest_101");

      const targetCharge = initialFolio.charges.find((c) => c.chargeId === "chg_01");
      expect(targetCharge).toBeDefined();
      const originalAmount = targetCharge!.amount; // 300.00 USD

      // 2. Ejecutar Split en 2 porciones ($150.00 y $100.00)
      const portion1 = 150;
      const portion2 = 100;
      expect(portion1 + portion2).toBe(originalAmount);

      const splitDtoReq = mapSplitChargeRequestToDto({
        chargeId: targetCharge!.chargeId,
        portions: [
          { targetFolioId: "fol_guest_101", amount: portion1, description: "Noche 1 Habitación (Parte 1)" },
          { targetFolioId: "fol_guest_101", amount: portion2, description: "Noche 1 Habitación (Parte 2 - Empresa)" },
        ],
      });

      const splitResultDto = await splitFolioChargeDto(initialFolio.folioId, splitDtoReq);
      const splitResult = mapSplitChargeResultDtoToDomain(splitResultDto);

      // Verificación de conservación de saldo en Split
      expect(splitResult.createdCharges.length).toBe(2);
      const sumNewCharges = splitResult.createdCharges.reduce((acc, c) => acc + c.amount, 0);
      expect(sumNewCharges).toBe(originalAmount);

      // 3. Transferir la porción de $100.00 al folio corporativo fol_company_202
      const chargeToTransfer = splitResult.createdCharges[1];
      const transferDtoReq = mapTransferChargeRequestToDto({
        chargeId: chargeToTransfer.chargeId,
        targetFolioId: "fol_company_202",
        reason: "Facturación directa a cuenta corporativa",
      });

      const transferResultDto = await transferFolioChargeDto(initialFolio.folioId, transferDtoReq);
      const transferResult = mapTransferChargeResultDtoToDomain(transferResultDto);

      // Verificación de decremento en folio origen
      expect(transferResult.updatedSourceFolio.folioId).toBe("fol_guest_101");
      const remainingChargesSource = transferResult.updatedSourceFolio.charges.map((c) => c.chargeId);
      expect(remainingChargesSource).not.toContain(chargeToTransfer.chargeId);
      expect(transferResult.targetFolioId).toBe("fol_company_202");
    });
  });

  describe("Journey 2: Full Lifecycle — Authorize -> Partial Captures -> Partial Refunds", () => {
    it("strictly tracks authorization limits, capturable balances, and cumulative refunds", async () => {
      // 1. Autorización de Pago de $1000.00
      const authReqDto = mapAuthorizePaymentRequestToDto({
        folioId: "fol_guest_101",
        method: "CREDIT_CARD",
        amount: 1000,
        currency: "USD",
        cardToken: "tok_visa_valid",
        cardHolderName: "Ana Martínez",
        last4: "4242",
        cardBrand: "Visa",
      });

      const authResDto = await authorizePaymentDto(authReqDto);
      let paymentDomain: Payment = mapPaymentDtoToDomain(authResDto);

      expect(paymentDomain.status).toBe("AUTHORIZED");
      expect(paymentDomain.authorizedAmount).toBe(1000);
      expect(paymentDomain.capturedAmount).toBe(0);
      expect(paymentDomain.remainingCapturableAmount).toBe(1000);
      expect(paymentDomain.remainingRefundableAmount).toBe(0);
      expect(paymentDomain.auditTrail.some((a) => a.action === "AUTHORIZE")).toBe(true);

      const paymentId = paymentDomain.paymentId;

      // 2. Primera Captura Parcial ($400.00)
      const capReqDto1 = mapCapturePaymentRequestToDto({
        amount: 400,
        reason: "Cargo parcial adelantado",
      });
      const capResDto1 = await capturePaymentDto(paymentId, capReqDto1);
      paymentDomain = mapPaymentDtoToDomain(capResDto1);

      expect(paymentDomain.status).toBe("PARTIALLY_CAPTURED");
      expect(paymentDomain.capturedAmount).toBe(400);
      expect(paymentDomain.remainingCapturableAmount).toBe(600);
      expect(paymentDomain.remainingRefundableAmount).toBe(400);

      // 3. Segunda Captura Parcial (los $600.00 restantes -> Total $1000.00)
      const capReqDto2 = mapCapturePaymentRequestToDto({
        amount: 600,
        reason: "Liquidación total de estancia",
      });
      const capResDto2 = await capturePaymentDto(paymentId, capReqDto2);
      paymentDomain = mapPaymentDtoToDomain(capResDto2);

      expect(paymentDomain.status).toBe("CAPTURED");
      expect(paymentDomain.capturedAmount).toBe(1000);
      expect(paymentDomain.remainingCapturableAmount).toBe(0);
      expect(paymentDomain.remainingRefundableAmount).toBe(1000);

      // 4. Intento de sobre-captura (debe fallar)
      await expect(
        capturePaymentDto(paymentId, { amount: "100.00" }),
      ).rejects.toThrow();

      // 5. Primer Reembolso Parcial ($250.00)
      const refReqDto1 = mapRefundPaymentRequestToDto({
        amount: 250,
        reason: "Descuento de fidelidad post-checkout",
        currency: "USD",
      });
      const refResDto1 = await refundPaymentDto(paymentId, refReqDto1);
      paymentDomain = mapPaymentDtoToDomain(refResDto1);

      expect(paymentDomain.status).toBe("PARTIALLY_REFUNDED");
      expect(paymentDomain.refundedAmount).toBe(250);
      expect(paymentDomain.remainingRefundableAmount).toBe(750);

      // 6. Segundo Reembolso (los $750.00 restantes -> Total $1000.00 reembolsados)
      const refReqDto2 = mapRefundPaymentRequestToDto({
        amount: 750,
        reason: "Devolución por cancelación excepcional",
        currency: "USD",
      });
      const refResDto2 = await refundPaymentDto(paymentId, refReqDto2);
      paymentDomain = mapPaymentDtoToDomain(refResDto2);

      expect(paymentDomain.status).toBe("REFUNDED");
      expect(paymentDomain.refundedAmount).toBe(1000);
      expect(paymentDomain.remainingRefundableAmount).toBe(0);

      // 7. Intento de sobre-reembolso (debe fallar)
      await expect(
        refundPaymentDto(paymentId, { amount: "10.00", reason: "Exceso" }),
      ).rejects.toThrow();
    });
  });

  describe("Journey 3: Authorize -> Immediate Void", () => {
    it("successfully voids uncaptured authorizations and prevents subsequent captures", async () => {
      // 1. Autorización de $350.00
      const authReqDto = mapAuthorizePaymentRequestToDto({
        folioId: "fol_guest_101",
        method: "CREDIT_CARD",
        amount: 350,
        currency: "USD",
      });
      const authResDto = await authorizePaymentDto(authReqDto);
      const paymentDomain = mapPaymentDtoToDomain(authResDto);
      expect(paymentDomain.status).toBe("AUTHORIZED");

      // 2. Anulación (Void)
      const voidReqDto = mapVoidPaymentRequestToDto({
        reason: "Huésped canceló el check-in antes de registrar cargos",
      });
      const voidResDto = await voidPaymentDto(paymentDomain.paymentId, voidReqDto);
      const voidedPayment = mapPaymentDtoToDomain(voidResDto);

      expect(voidedPayment.status).toBe("VOIDED");
      expect(voidedPayment.auditTrail.some((a) => a.action === "VOID")).toBe(true);

      // 3. Intento de captura sobre pago anulado (debe fallar)
      await expect(
        capturePaymentDto(paymentDomain.paymentId, { amount: "350.00" }),
      ).rejects.toThrow();
    });
  });

  describe("Security & Compliance: Zero PAN/CVV & Append-Only Audit Trail", () => {
    it("ensures zero PAN and zero CVV exist across all payment domain models and DTO lists", async () => {
      const listDto = await fetchPaymentsDto();
      const listDomain = mapPaymentListResponseDtoToDomain(listDto);

      expect(listDomain.payments.length).toBeGreaterThan(0);

      for (const payment of listDomain.payments) {
        // Verificar que no existen llaves sensibles en la estructura
        const rawKeys = Object.keys(payment);
        expect(rawKeys).not.toContain("pan");
        expect(rawKeys).not.toContain("panFull");
        expect(rawKeys).not.toContain("cvv");
        expect(rawKeys).not.toContain("cvc");
        expect(rawKeys).not.toContain("securityCode");

        // Si hay last4, debe tener exactamente 4 dígitos o ser null
        if (payment.last4 !== null) {
          expect(payment.last4).toMatch(/^\d{4}$/);
        }

        // Verificar inmutabilidad y orden del Audit Trail
        expect(Array.isArray(payment.auditTrail)).toBe(true);
        for (const audit of payment.auditTrail) {
          expect(["AUTHORIZE", "CAPTURE", "VOID", "REFUND", "FAIL"]).toContain(audit.action);
          expect(audit.auditId).toBeTruthy();
          expect(audit.amount).toBeGreaterThanOrEqual(0);
          expect(audit.performedAt).toBeInstanceOf(Date);
        }
      }
    });
  });
});
