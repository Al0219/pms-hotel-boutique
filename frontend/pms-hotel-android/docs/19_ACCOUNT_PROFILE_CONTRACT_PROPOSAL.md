# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0201

## GuestAccount / GuestProfile

**Tarea:** `IMP-AND-0201 — Crear Account/Profile contracts`  
**Estado del contrato:** `APPROVED`  
**Autoridad visual principal:**  
- `240:132 — MOB-12 — Mi cuenta / cargos`
- `1102:414 — MOB-18 — Perfil y preferencias / Editar`
- `1102:450 — MOB-18 — Perfil y preferencias / Guardado`
- `1163:474 — MOB-V3 — Perfil / Loading`
- `1163:493 — MOB-V3 — Perfil / Error`
- `1163:512 — MOB-V3 — Perfil / Offline`

**Reviewer:** `WEB-2`  
**DoR objetivo:** Sprint 0 completada + `Account/Profile frontend/mock contract approved`

---

## 1. Regla semántica central

```text
GuestAccount != GuestProfile
```

Se mantienen como conceptos distintos.

### GuestAccount

Representa identidad y datos de contacto de la cuenta huésped, además de preferencias de privacidad/consentimiento que pertenecen a la cuenta.

### GuestProfile

Representa preferencias de hospitalidad/personalización del huésped.

No se mezclan con:

- Folio;
- cargos;
- pagos;
- Checkout;
- factura;
- Rewards;
- Promotions.

Los valores financieros visibles en `240:132` pertenecen a otro contrato funcional y **no forman parte de IMP-AND-0201**.

---

## 2. Arquitectura frontend-first

```text
src/data/mocks/account/
→ mock boundary
→ fixture DTO
→ mapper
→ domain
→ TanStack Query / Mutation
→ UI
```

Sin Backend real.

Este contrato no fija:

- endpoints;
- HTTP;
- auth Backend;
- persistencia;
- tablas;
- IDs Backend;
- esquema fiscal.

---

## 3. Evidencia Figma — Cuenta

`240:132 — MOB-12 — Mi cuenta / cargos`

Confirma:

- tab `Cuenta`;
- entrada `Perfil y preferencias`;
- una cuenta vinculada al contexto actual.

El copy:

```text
Solo tu reserva vinculada · otras del dispositivo ocultas.
```

es contexto de UI; no implica que `GuestAccount` deba almacenar una lista de reservas.

Los cargos/folio de este frame quedan fuera de este contrato.

---

## 4. Evidencia Figma — Perfil editable

`1102:414 — MOB-18 — Perfil y preferencias / Editar`

Datos visibles:

```text
Datos personales
Alan Palacios
alan@email.com
+502 5555 5555

Idioma
Español

Cama
King

Habitación
Tranquila

Piso
Alto

Evitar
Zonas ruidosas

Marketing SMS
[valor de consentimiento]

Privacidad
Solo cuenta
```

Además:

```text
Guardar cambios
← Mi cuenta
```

Y una nota de cambio pendiente relacionada únicamente con Marketing/SMS.

---

## 5. Evidencia Figma — Guardado

`1102:450 — MOB-18 — Perfil y preferencias / Guardado`

Confirma:

```text
Perfil actualizado
Marketing SMS revocado · otras finalidades/canales sin cambios
Volver a mi cuenta
```

También existe un texto visual de auditoría:

```text
Audit CONSENT_REVOKED · 08 sep 14:22 · Android Perfil · Marketing/SMS
```

Ese texto puede simularse como presentación frontend.

No define un sistema Backend de auditoría.

---

## 6. Contrato frontend/mock propuesto

```ts
export type MarketingSmsConsentFixture =
  | "CONSENTED"
  | "REVOKED";

export interface GuestAccountFixtureDto {
  fixtureKey: string;
  displayName: string;
  emailText: string;
  phoneText: string;
  privacyText: string;
  marketingSmsConsent: MarketingSmsConsentFixture;
}

export interface GuestProfileFixtureDto {
  languageText: string;
  bedPreferenceText: string;
  roomPreferenceText: string;
  floorPreferenceText: string;
  avoidPreferenceText: string;
}

export interface AccountProfileFixtureDto {
  account: GuestAccountFixtureDto;
  profile: GuestProfileFixtureDto;
}

export interface UpdateAccountProfileFixtureInput {
  profile: GuestProfileFixtureDto;
  marketingSmsConsent: MarketingSmsConsentFixture;
}

export interface UpdateAccountProfileFixtureResult {
  account: GuestAccountFixtureDto;
  profile: GuestProfileFixtureDto;
  confirmationText: string;
  auditText: string;
}
```

---

## 7. Por qué el input NO edita nombre/email/teléfono

Figma muestra nombre, email y teléfono dentro de `Datos personales`, pero no muestra controles específicos de edición para esos campos en los frames canónicos disponibles.

El CTA `Guardar cambios` sí está acompañado por:

- preferencias;
- consentimiento Marketing SMS;
- nota de cambio pendiente;
- estado guardado del consentimiento.

Por tanto, el contrato mínimo autoriza modificar:

- preferencias de `GuestProfile`;
- `marketingSmsConsent`.

`displayName`, `emailText` y `phoneText` se leen desde `GuestAccount`, pero no se declaran editables hasta que exista una autoridad visual/funcional explícita.

---

## 8. Semántica de campos

### `fixtureKey`

Identidad local/frontend.

No es accountId Backend.

### `displayName`

Texto visible.

No separa firstName/lastName porque el frontend no lo necesita.

### `emailText`

Texto de presentación.

No define verificación de email ni autenticación.

### `phoneText`

Texto de presentación.

No define formato Backend ni OTP.

### `privacyText`

Texto visible:

```text
Solo cuenta
```

No se convierte en sistema completo de privacy scopes.

### `marketingSmsConsent`

Figma demuestra explícitamente:

```text
CONSENTED
REVOKED
```

Se permite este union porque existe autoridad visual/funcional.

No se generaliza a otros canales o finalidades.

### Preferencias de Profile

Se mantienen como textos:

```text
Español
King
Tranquila
Alto
Zonas ruidosas
```

No se crean catálogos Backend ni IDs.

---

## 9. Domain

```ts
export type MarketingSmsConsent =
  | "consented"
  | "revoked";

export interface GuestAccount {
  key: string;
  displayName: string;
  emailText: string;
  phoneText: string;
  privacyText: string;
  marketingSmsConsent: MarketingSmsConsent;
}

export interface GuestProfile {
  languageText: string;
  bedPreferenceText: string;
  roomPreferenceText: string;
  floorPreferenceText: string;
  avoidPreferenceText: string;
}

export interface AccountProfile {
  account: GuestAccount;
  profile: GuestProfile;
}

export interface AccountProfileUpdateResult {
  account: GuestAccount;
  profile: GuestProfile;
  confirmationText: string;
  auditText: string;
}
```

---

## 10. Mapper

Debe:

- `fixtureKey → key`;
- `CONSENTED → consented`;
- `REVOKED → revoked`;
- preservar textos visibles.

No debe:

- separar nombres;
- normalizar email;
- parsear teléfono;
- crear IDs;
- inferir country code;
- crear preference IDs;
- generalizar consentimientos.

---

## 11. Dummy dataset

Ubicación:

```text
src/data/mocks/account/
```

Fixture conceptual:

```ts
{
  account: {
    fixtureKey: "guest-account-primary",
    displayName: "Alan Palacios",
    emailText: "alan@email.com",
    phoneText: "+502 5555 5555",
    privacyText: "Solo cuenta",
    marketingSmsConsent: "CONSENTED"
  },
  profile: {
    languageText: "Español",
    bedPreferenceText: "King",
    roomPreferenceText: "Tranquila",
    floorPreferenceText: "Alto",
    avoidPreferenceText: "Zonas ruidosas"
  }
}
```

Mutation success de ejemplo:

```ts
{
  account: {
    ...,
    marketingSmsConsent: "REVOKED"
  },
  profile: {
    ...
  },
  confirmationText:
    "Marketing SMS revocado · otras finalidades/canales sin cambios",
  auditText:
    "Audit CONSENT_REVOKED · 08 sep 14:22 · Android Perfil · Marketing/SMS"
}
```

Estos son datos dummy.

No constituyen prueba legal, consentimiento Backend real ni auditoría persistida.

---

## 12. Query

La lectura Account/Profile debe poder producir:

- loading;
- data;
- generic error;
- offline.

Figma específico:

### Loading

`1163:474`

```text
Cargando Perfil
Estamos recuperando datos y preferencias…
Reintentar
```

### Error

`1163:493`

```text
Error en Perfil
Reintenta para recuperar datos y preferencias.
Reintentar
```

### Offline

`1163:512`

```text
Perfil sin conexión
Conéctate y reintenta para recuperar datos y preferencias.
Reintentar
```

`NetworkError` modela offline.

No NetInfo, cola, background sync ni persistencia.

---

## 13. Mutation de guardado

Input:

```ts
UpdateAccountProfileFixtureInput
```

Result:

```ts
UpdateAccountProfileFixtureResult
```

Flujo:

```text
Editar preferencias/consentimiento
→ Guardar cambios
→ pending
→ success/error/offline
```

### Pending

- CTA disabled;
- no double submit;
- no success optimista.

### Success

Usar `1102:450`:

```text
Perfil actualizado
Marketing SMS revocado · otras finalidades/canales sin cambios
Volver a mi cuenta
```

### Error / Offline

Retry manual.

No asumir persistencia real.

---

## 14. Navegación

La UI final pertenece al dominio de `Cuenta`.

Rutas concretas se definirán al implementar `IMP-AND-0202/0303`, pero deben consumir Guest Navigation V3.

Cuando Account/Profile esté disponible:

```text
Cuenta = selected
```

No crear una footbar privada.

`IMP-AND-0201` por sí misma crea contratos, no habilita todavía la tab Cuenta.

---

## 15. Qué NO pertenece a GuestAccount/Profile

Aunque `240:132` sea `Mi cuenta`, quedan fuera:

```text
total estadía
pagado/garantía
saldo pendiente
folio items
priceText
payment
invoice
checkout
rewards tier
promotions
```

Esos conceptos tienen contratos/tareas propias.

Esto evita convertir `GuestAccount` en una entidad monolítica.

---

## 16. Campos deliberadamente excluidos

```text
accountId Backend
profileId Backend
guestId Backend
reservationId
stayId
propertyId
password
passwordHash
username
role
permissions
verifiedEmail
verifiedPhone
avatar
birthDate
gender
nationality
documentNumber
address
loyaltyId
folioId
paymentMethod
```

También fuera:

- autenticación;
- login;
- logout;
- cambio de password;
- recuperación de cuenta;
- OTP;
- identidad legal;
- preferencias no mostradas;
- marketing email/push;
- consentimiento genérico multicanal.

---

## 17. Pruebas contractuales requeridas

Para `IMP-AND-0201`:

1. mapper Account fixture → Domain;
2. mapper Profile fixture → Domain;
3. Account y Profile permanecen tipos distintos;
4. fixtureKey no llega como Backend semantic ID;
5. CONSENTED/REVOKED mapean correctamente;
6. preferencias se preservan;
7. datos personales se preservan;
8. mocks se pueden leer sin Backend;
9. UI futura no necesitará DTO directo.

Para features consumidoras:

10. query loading;
11. query error;
12. query NetworkError → offline;
13. update pending;
14. double submit;
15. update success;
16. update error/retry;
17. update offline/retry;
18. success `Perfil actualizado`;
19. volver a Cuenta;
20. GuestNavigationShell reutilizado.

---

## 18. Futuro Backend

Posteriormente:

```text
AccountProfileMockService
→ AccountProfileApiService
```

Los DTO Backend podrán:

- separar nombre;
- normalizar email;
- usar teléfono estructurado;
- usar catálogos de preferencias;
- usar consent records reales.

Eso no obliga a cambiar Domain/UI si la boundary absorbe la diferencia.

---

## 19. Decisiones aprobadas para este contrato

La aprobación cubre estas decisiones:

1. `GuestAccount` = identidad/contacto/privacidad/Marketing SMS.
2. `GuestProfile` = preferencias de hospitalidad.
3. Folio/cargos no pertenecen a ninguno.
4. nombre/email/teléfono son read-only en el contrato actual.
5. actualización cubre Profile + Marketing SMS.
6. `CONSENTED | REVOKED` es el único consentimiento tipado.
7. auditText es presentación dummy, no auditoría Backend.
8. todos los datos funcionan desde `src/data/mocks/account/`.

Como resultado de esta aprobación puede marcarse:

```text
IMP-AND-0201
PENDIENTE → READY
```

La implementación de UI final continuará posteriormente en `IMP-AND-0202` / `IMP-AND-0303`.
