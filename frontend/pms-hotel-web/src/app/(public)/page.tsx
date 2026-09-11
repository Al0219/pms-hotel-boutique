"use client";

import { useState } from "react";

import {
  fetchAvailabilityDto,
  mapAvailabilityResponseToDomain,
  type AvailabilitySearchResult,
} from "@/modules/availability";
import {
  fetchFolioByIdDto,
  FolioDetailCard,
  FolioSplitModal,
  FolioTransferModal,
  mapFolioDtoToDomain,
  mapSplitChargeRequestToDto,
  mapSplitChargeResultDtoToDomain,
  mapTransferChargeRequestToDto,
  mapTransferChargeResultDtoToDomain,
  splitFolioChargeDto,
  transferFolioChargeDto,
  type Folio,
  type FolioCharge,
  type SplitChargePortion,
} from "@/modules/folio";
import {
  authorizePaymentDto,
  capturePaymentDto,
  createPaymentGuaranteeDto,
  fetchPaymentsDto,
  mapAuthorizePaymentRequestToDto,
  mapCapturePaymentRequestToDto,
  mapPaymentDtoToDomain,
  mapPaymentGuaranteeDtoToDomain,
  mapPaymentGuaranteeRequestToDto,
  mapPaymentListResponseDtoToDomain,
  mapVoidPaymentRequestToDto,
  PaymentAuthorizeModal,
  PaymentCaptureModal,
  PaymentListCard,
  PaymentVoidModal,
  voidPaymentDto,
  type AuthorizePaymentRequest,
  type CapturePaymentRequest,
  type Payment,
  type PaymentGuaranteeResult,
  type VoidPaymentRequest,
} from "@/modules/payments";

export default function PublicShellPage() {
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilitySearchResult | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentGuaranteeResult | null>(null);
  const [folioResult, setFolioResult] = useState<Folio | null>(null);
  const [chargeToSplit, setChargeToSplit] = useState<FolioCharge | null>(null);
  const [chargeToTransfer, setChargeToTransfer] = useState<FolioCharge | null>(null);
  const [paymentsList, setPaymentsList] = useState<Payment[] | null>(null);
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [paymentToCapture, setPaymentToCapture] = useState<Payment | null>(null);
  const [paymentToVoid, setPaymentToVoid] = useState<Payment | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleTestAvailability(propertyId: string) {
    setLoading("availability");
    setErrorMsg(null);
    try {
      const dto = await fetchAvailabilityDto({
        property_id: propertyId,
        check_in_date: "2026-10-01",
        check_out_date: "2026-10-04",
        adults: 2,
        children: 0,
        rooms_count: 1,
      });
      const domain = mapAvailabilityResponseToDomain(dto);
      setAvailabilityResult(domain);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  }

  async function handleTestPayment(cardToken: string) {
    setLoading("payment");
    setErrorMsg(null);
    try {
      const requestDto = mapPaymentGuaranteeRequestToDto({
        paymentMethod: "CREDIT_CARD",
        cardHolderName: "Carlos Morales",
        cardToken,
        last4: "4242",
        cardBrand: "Visa",
        expirationMonth: 12,
        expirationYear: 2028,
        amount: 750,
        currency: "USD",
        reservationReference: "res_demo_101",
      });
      const responseDto = await createPaymentGuaranteeDto(requestDto);
      const domainResult = mapPaymentGuaranteeDtoToDomain(responseDto);
      setPaymentResult(domainResult);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  }

  async function handleTestFolio(folioId: string) {
    setLoading("folio");
    setErrorMsg(null);
    try {
      const dto = await fetchFolioByIdDto(folioId);
      const domainResult = mapFolioDtoToDomain(dto);
      setFolioResult(domainResult);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirmSplit(portions: SplitChargePortion[]) {
    if (!folioResult || !chargeToSplit) return;
    setLoading("split");
    setErrorMsg(null);
    try {
      const splitRequestDto = mapSplitChargeRequestToDto({
        chargeId: chargeToSplit.chargeId,
        portions,
      });
      const resultDto = await splitFolioChargeDto(folioResult.folioId, splitRequestDto);
      const domainResult = mapSplitChargeResultDtoToDomain(resultDto);
      setFolioResult(domainResult.updatedSourceFolio);
      setChargeToSplit(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al dividir el cargo");
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirmTransfer(targetFolioId: string, reason: string) {
    if (!folioResult || !chargeToTransfer) return;
    setLoading("transfer");
    setErrorMsg(null);
    try {
      const transferRequestDto = mapTransferChargeRequestToDto({
        chargeId: chargeToTransfer.chargeId,
        targetFolioId,
        reason,
      });
      const resultDto = await transferFolioChargeDto(folioResult.folioId, transferRequestDto);
      const domainResult = mapTransferChargeResultDtoToDomain(resultDto);
      setFolioResult(domainResult.updatedSourceFolio);
      setChargeToTransfer(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al transferir el cargo");
    } finally {
      setLoading(null);
    }
  }

  async function handleFetchPayments(folioId?: string) {
    setLoading("payments-list");
    setErrorMsg(null);
    try {
      const dto = await fetchPaymentsDto(folioId ? { folio_id: folioId } : undefined);
      const domainResult = mapPaymentListResponseDtoToDomain(dto);
      setPaymentsList(domainResult.payments);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al consultar listado de pagos");
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirmAuthorize(request: AuthorizePaymentRequest) {
    setLoading("authorize");
    setErrorMsg(null);
    try {
      const dto = mapAuthorizePaymentRequestToDto(request);
      const responseDto = await authorizePaymentDto(dto);
      const domainResult = mapPaymentDtoToDomain(responseDto);
      setPaymentsList((prev) => (prev ? [domainResult, ...prev] : [domainResult]));
      setIsAuthorizeModalOpen(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la autorización");
      throw err;
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirmCapture(paymentId: string, request: CapturePaymentRequest) {
    setLoading("capture");
    setErrorMsg(null);
    try {
      const dto = mapCapturePaymentRequestToDto(request);
      const responseDto = await capturePaymentDto(paymentId, dto);
      const domainResult = mapPaymentDtoToDomain(responseDto);
      setPaymentsList((prev) =>
        prev
          ? prev.map((p) => (p.paymentId === paymentId ? domainResult : p))
          : [domainResult],
      );
      setPaymentToCapture(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la captura del pago");
      throw err;
    } finally {
      setLoading(null);
    }
  }

  async function handleConfirmVoid(paymentId: string, request: VoidPaymentRequest) {
    setLoading("void");
    setErrorMsg(null);
    try {
      const dto = mapVoidPaymentRequestToDto(request);
      const responseDto = await voidPaymentDto(paymentId, dto);
      const domainResult = mapPaymentDtoToDomain(responseDto);
      setPaymentsList((prev) =>
        prev
          ? prev.map((p) => (p.paymentId === paymentId ? domainResult : p))
          : [domainResult],
      );
      setPaymentToVoid(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error durante la anulación del pago");
      throw err;
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ marginBottom: "2rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#111827", marginBottom: "0.5rem" }}>
          PMS Hotel Boutique — Consola de Pruebas WEB-4
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
          Prueba interactiva de los servicios y componentes implementados para <strong>Disponibilidad (IMP-WEB-0102)</strong>, <strong>Garantías de Pago (IMP-WEB-0109)</strong>, <strong>StatusBadge (IMP-WEB-S401)</strong>, <strong>Folio Avanzado (IMP-WEB-0401)</strong>, <strong>Routing & Split (IMP-WEB-0402)</strong>, <strong>Transferencia de Cargos (IMP-WEB-0403)</strong>, <strong>Listado de Pagos (IMP-WEB-0404)</strong>, <strong>Autorización (IMP-WEB-0405)</strong>, <strong>Captura (IMP-WEB-0406)</strong> y <strong>Anulación/Void (IMP-WEB-0407)</strong>.
        </p>
      </header>

      {errorMsg && (
        <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Sección 1: Disponibilidad */}
      <section style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "10px", marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", marginBottom: "0.75rem" }}>
          1. Servicio de Disponibilidad Pública (`IMP-WEB-0102`)
        </h2>
        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Consulta el servicio `/api/v1/public/availability` y mapea a modelos de dominio con cálculo ATS.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            onClick={() => handleTestAvailability("prop_boutique_01")}
            disabled={loading === "availability"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            {loading === "availability" ? "Consultando..." : "Consultar Disponibilidad (Con Habitaciones)"}
          </button>
          <button
            onClick={() => handleTestAvailability("empty_property")}
            disabled={loading === "availability"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#4b5563", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            Consultar Disponibilidad (Vacío)
          </button>
        </div>

        {availabilityResult && (
          <div style={{ backgroundColor: "#ffffff", padding: "1rem", borderRadius: "6px", border: "1px solid #d1d5db" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>
              Resultado: {availabilityResult.roomTypes.length} tipo(s) de habitación ({availabilityResult.totalNights} noches, {availabilityResult.checkInDate} al {availabilityResult.checkOutDate})
            </h3>
            {availabilityResult.roomTypes.length === 0 ? (
              <p style={{ color: "#6b7280", fontStyle: "italic" }}>No hay habitaciones disponibles para estas fechas.</p>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {availabilityResult.roomTypes.map((rt) => (
                  <div key={rt.roomTypeId} style={{ border: "1px solid #e5e7eb", padding: "0.75rem", borderRadius: "6px", backgroundColor: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong style={{ color: "#111827" }}>{rt.name} ({rt.code})</strong>
                      <span style={{ fontSize: "0.85rem", backgroundColor: "#dcfce7", color: "#166534", padding: "0.2rem 0.6rem", borderRadius: "4px", fontWeight: "bold" }}>
                        ATS: {rt.availableRoomsCount} disponibles
                      </span>
                    </div>
                    <p style={{ color: "#4b5563", fontSize: "0.85rem", margin: "0.4rem 0" }}>{rt.description}</p>
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#374151" }}>Tarifas: </span>
                      {rt.ratePlans.map((rp) => (
                        <span key={rp.ratePlanId} style={{ marginRight: "1rem", fontSize: "0.85rem", color: "#2563eb" }}>
                          {rp.name}: ${rp.totalAmount} {rp.currency} (${rp.baseNightlyRate}/noche)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sección 2: Garantías de Pago */}
      <section style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "10px", marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", marginBottom: "0.75rem" }}>
          2. Servicio de Garantía y Pago Provisional (`IMP-WEB-0109`)
        </h2>
        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Procesa solicitudes de autorización de tarjeta mediante token simulado seguro sin PAN/CVV.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            onClick={() => handleTestPayment("tok_visa_valid")}
            disabled={loading === "payment"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#059669", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            {loading === "payment" ? "Procesando..." : "Simular Tarjeta Aprobada"}
          </button>
          <button
            onClick={() => handleTestPayment("tok_declined")}
            disabled={loading === "payment"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            Simular Tarjeta Declinada
          </button>
        </div>

        {paymentResult && (
          <div style={{ backgroundColor: "#ffffff", padding: "1rem", borderRadius: "6px", border: "1px solid #d1d5db" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>
              Respuesta del Pago:
            </h3>
            <div style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
              <p>
                <strong>Estado: </strong>
                <span style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  backgroundColor: paymentResult.status === "AUTHORIZED" ? "#dcfce7" : "#fee2e2",
                  color: paymentResult.status === "AUTHORIZED" ? "#166534" : "#991b1b",
                }}>
                  {paymentResult.status}
                </span>
              </p>
              <p><strong>Monto: </strong>${paymentResult.amount} {paymentResult.currency}</p>
              <p><strong>Referencia Proveedor: </strong>{paymentResult.providerReference ?? "N/A"}</p>
              <p><strong>Tarjeta: </strong>{paymentResult.cardBrand} terminada en **** {paymentResult.last4}</p>
              {paymentResult.failureReason && (
                <p style={{ color: "#dc2626" }}><strong>Motivo de rechazo: </strong>{paymentResult.failureReason}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sección 3: Folio Avanzado, Split y Transfer */}
      <section style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "10px", marginBottom: "2rem", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", marginBottom: "0.75rem" }}>
          3. Folio Avanzado, StatusBadge, Split y Transferencia (`IMP-WEB-S401`, `0401`, `0402`, `0403`)
        </h2>
        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Consulta el estado de cuenta y usa <strong>&quot;Dividir&quot;</strong> para fraccionar cargos o <strong>&quot;Transferir&quot;</strong> para reasignar cargos a otro folio.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            onClick={() => handleTestFolio("fol_guest_101")}
            disabled={loading === "folio"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            {loading === "folio" ? "Cargando Folio..." : "Cargar Detalle de Folio (Huésped)"}
          </button>
        </div>

        {folioResult && (
          <FolioDetailCard
            folio={folioResult}
            onApplyPayment={() => alert("Modal para registrar cobro en caja o terminal POS")}
            onSplitCharge={(charge) => setChargeToSplit(charge)}
            onTransferCharge={(charge) => setChargeToTransfer(charge)}
          />
        )}

        {chargeToSplit && (
          <FolioSplitModal
            charge={chargeToSplit}
            onSplit={handleConfirmSplit}
            onClose={() => setChargeToSplit(null)}
          />
        )}

        {chargeToTransfer && (
          <FolioTransferModal
            charge={chargeToTransfer}
            onTransfer={handleConfirmTransfer}
            onClose={() => setChargeToTransfer(null)}
          />
        )}
      </section>

      {/* Sección 4: Listado de Pagos y Domain Model */}
      <section style={{ backgroundColor: "#f9fafb", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1f2937", marginBottom: "0.75rem" }}>
          4. Listado, Auditoría, Autorización, Captura y Anulación (`IMP-WEB-0404`, `0405`, `0406`, `0407`)
        </h2>
        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Listado de transacciones financieras con auditoría append-only, modal de nueva autorización, liquidación (captura total o parcial) y anulación/void de autorizaciones sin captura.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            onClick={() => handleFetchPayments()}
            disabled={loading === "payments-list"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#0284c7", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            {loading === "payments-list" ? "Consultando..." : "Consultar Todos los Pagos"}
          </button>
          <button
            onClick={() => handleFetchPayments("fol_guest_101")}
            disabled={loading === "payments-list"}
            style={{ padding: "0.6rem 1.2rem", backgroundColor: "#0f766e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >
            Filtrar por Folio fol_guest_101
          </button>
        </div>

        {paymentsList && (
          <PaymentListCard
            payments={paymentsList}
            onAuthorizeNew={() => setIsAuthorizeModalOpen(true)}
            onCapturePayment={(payment) => setPaymentToCapture(payment)}
            onVoidPayment={(payment) => setPaymentToVoid(payment)}
            onRefundPayment={(payment) => alert(`Reembolsar pago ${payment.paymentId}`)}
          />
        )}

        {isAuthorizeModalOpen && (
          <PaymentAuthorizeModal
            initialFolioId={folioResult?.folioId || "fol_guest_101"}
            onAuthorize={handleConfirmAuthorize}
            onClose={() => setIsAuthorizeModalOpen(false)}
          />
        )}

        {paymentToCapture && (
          <PaymentCaptureModal
            payment={paymentToCapture}
            onCapture={handleConfirmCapture}
            onClose={() => setPaymentToCapture(null)}
          />
        )}

        {paymentToVoid && (
          <PaymentVoidModal
            payment={paymentToVoid}
            onVoid={handleConfirmVoid}
            onClose={() => setPaymentToVoid(null)}
          />
        )}
      </section>
    </main>
  );
}
