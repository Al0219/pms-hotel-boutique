# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0203

## Checkout / Folio / Invoice

**Tarea:** `IMP-AND-0203 — Checkout e invoice`  
**Estado:** `APPROVED`  
**Autoridad visual:**  
- `240:132 — MOB-12 — Mi cuenta / cargos`
- `240:193 — MOB-13 — Check-out digital`
- `240:252 — MOB-14 — Factura`
- `334:1838 — MOB-14 — Factura / PDF generado`
- `334:1865 — MOB-14 — Factura / Correo enviado`

**Reviewer:** `WEB-4`  
**DoR objetivo:** `Checkout/Folio frontend/mock contract approved`

---

## 1. Regla central

Todo el flujo es una **representación frontend simulada** hasta integración Backend/fiscal.

Los textos `DTE`, `FEL`, `CERTIFICADA`, saldos, cargos y factura existen porque Figma los muestra, pero esta implementación dummy:

- no certifica documentos;
- no genera validez fiscal real;
- no procesa pagos;
- no persiste Folio;
- no envía correo real;
- no define API fiscal.

---

## 2. Contrato propuesto

```ts
export interface FolioItemFixtureDto {
  fixtureKey: string;
  label: string;
  priceText: string;
}

export interface FolioFixtureDto {
  totalStayText: string;
  paidGuaranteeText: string;
  pendingBalanceText: string;
  items: FolioItemFixtureDto[];
  totalText: string;
}

export interface CheckoutStayFixtureDto {
  roomDisplayText: string;
  stayDatesText: string;
  expectedDepartureText: string;
}

export interface CheckoutCheckFixtureDto {
  fixtureKey: string;
  label: string;
  valueText: string;
}

export interface CheckoutFixtureDto {
  stay: CheckoutStayFixtureDto;
  checks: CheckoutCheckFixtureDto[];
  departureNoteText: string;
}

export interface SubmitCheckoutFixtureInput {
  departureNoteText: string;
}

export interface SubmitCheckoutFixtureResult {
  completed: true;
}

export interface InvoiceFixtureDto {
  documentTypeText: string;
  referenceText: string;
  totalText: string;
  statusText: string;
  dateText: string;
}

export interface GenerateInvoicePdfFixtureResult {
  fileDisplayText: string;
}

export interface SendInvoiceEmailFixtureResult {
  confirmationText: string;
}
```

`completed: true` representa únicamente success de la mutation mock, no check-out operativo Backend.

---

## 3. Dummy data Figma

### Folio

```text
Total estadía · Q 3,920
Pagado/garantía · Q 2,400
Saldo pendiente · Q 1,520

Alojamiento · 3 noches   Q 3,150
Room service             Q 280
Minibar                  Q 110
Traslado aeropuerto      Q 280
Desayuno habitación      Q 100
Total                    Q 3,920
```

`priceText` permanece presentación; no amount/currency/tax.

### Checkout

```text
Habitación 203 · Suite Terraza
28–31 ago · 3 noches
Salida prevista · 11:00

Folio revisado      ✓
Saldo pendiente     Q 0
Minibar reportado   ✓
Llave / acceso      Digital
Vehículo valet      Solicitado

Todo estuvo excelente.
```

### Invoice

```text
DTE · Factura electrónica
FEL-0842 · HB-2026-08421
Total · Q 3,920
CERTIFICADA
Fecha · 31 ago · 10:48
```

Resultados visuales:

```text
PDF generado · FEL-0842.pdf
Enviada al correo registrado de María López
```

---

## 4. Domain

El Domain puede mantener exactamente los conceptos de presentación:

```ts
export interface FolioItem {
  key: string;
  label: string;
  priceText: string;
}

export interface Folio {
  totalStayText: string;
  paidGuaranteeText: string;
  pendingBalanceText: string;
  items: FolioItem[];
  totalText: string;
}

export interface CheckoutCheck {
  key: string;
  label: string;
  valueText: string;
}
```

No convertir textos en contabilidad estructurada en esta fase.

---

## 5. Query / Mutation

Lectura:

- Folio query;
- Checkout query;
- Invoice query.

Estados:

- loading;
- data;
- generic error;
- offline `NetworkError`.

Mutations:

- submit checkout;
- generate mock PDF result;
- send mock email result.

Reglas:

- pending bloquea double submit;
- no optimistic success;
- retry manual;
- sin cola offline.

---

## 6. Navegación

Flujo visual esperado:

```text
Cuenta
→ Check-out
→ Factura
→ acciones PDF / correo
→ Continuar
```

Todo consume Guest Navigation V3.

No se crea footbar privada.

---

## 7. Exclusiones

No crear:

```text
amount
currency
tax
taxLines
paymentId
folioId
invoiceId Backend
fiscalUUID
SAT authorization
certificate
signature
email delivery provider
PDF URL Backend
checkout timestamp real
```

Tampoco:

- pago real;
- certificación FEL real;
- envío de correo real;
- persistencia;
- corrección fiscal real.

---

## 8. Pruebas requeridas

- Folio dummy exacto;
- priceText no parseado;
- Checkout checks visibles;
- note editable;
- pending/double submit;
- checkout success;
- query error/offline;
- invoice dummy visible;
- PDF mock success;
- email mock success;
- retry manual;
- no fetch/UI DTO;
- GuestNavigationShell;
- Cuenta activa;
- regresión Account/Profile.

---

## 9. Aprobación

La aprobación acepta expresamente que todos los conceptos fiscales/financieros son **simulados y de presentación** hasta Backend/fiscal real.

Como resultado de esta aprobación:

```text
IMP-AND-0203
PENDIENTE → READY
```
