# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0302

## Promotions

**Tarea:** `IMP-AND-0302 — Promotions`  
**Estado:** `APPROVED`  
**Autoridad visual:**  
- `1115:336 — MOB-17 — Promociones aplicables`
- `1163:417 — MOB-V3 — Promociones / Loading`
- `1163:436 — MOB-V3 — Promociones / Error`
- `1163:455 — MOB-V3 — Promociones / Offline`

**Reviewer:** `WEB-2`

- **DoR:** `PASS — Promotions frontend/mock contract approved`
- **Implementación:** `COMPLETADA`
- **QA automatizada:** `PASS — lint, typecheck, 223 tests, Expo Doctor 21/21, export Android y Metro /status`
- **QA manual:** `PASS`
- **WEB-2:** `PASS`

---

## 1. Contrato propuesto

```ts
export interface PromotionDetailFixtureDto {
  fixtureKey: string;
  label: string;
  valueText: string;
}

export interface PromotionFixtureDto {
  fixtureKey: string;
  title: string;
  benefitText: string;
  details: PromotionDetailFixtureDto[];
}

export interface PromotionsFixtureDto {
  applicableCountText: string;
  accountContextText: string;
  channelText: string;
  items: PromotionFixtureDto[];
}
```

---

## 2. Dummy data Figma

Resumen:

```text
Ofertas aplicables
1
Cuenta Silver
DIRECT_APP
```

Oferta:

```text
Member Rate     −5%

Elegibilidad    Cuenta Silver
Canal           DIRECT_APP
Combinación     Exclusiva
Vigencia        Rate Plan vigente
Disponibilidad  Requerida
```

Estos valores son presentación.

No constituyen motor de pricing/promotions Backend.

---

## 3. Domain

```ts
export interface PromotionDetail {
  key: string;
  label: string;
  valueText: string;
}

export interface Promotion {
  key: string;
  title: string;
  benefitText: string;
  details: PromotionDetail[];
}

export interface Promotions {
  applicableCountText: string;
  accountContextText: string;
  channelText: string;
  items: Promotion[];
}
```

---

## 4. Query

Estados Figma:

### Loading

```text
Cargando Promociones
Estamos recuperando ofertas aplicables…
```

### Error

```text
Error en Promociones
Reintenta para recuperar ofertas aplicables.
Reintentar
```

### Offline

```text
Promociones sin conexión
Conéctate y reintenta para recuperar ofertas aplicables.
Reintentar
```

No mutation es necesaria en el frame actual. El retry vuelve a ejecutar la query real y descarta cualquier detalle seleccionado.

---

## 5. Navegación

Promotions es accesible desde el drawer Guest.

```text
BENEFICIOS
→ Promociones
→ /account/promotions
→ ← Mi cuenta
```

Se mantiene dentro del dominio Cuenta para navegación V3. La ruta hija usa `GuestChildHeader`, no muestra shell global, footbar, drawer ni FAB Chat y Back retorna de forma segura a `/account`; no crea una tab. Rewards y Promociones son entradas hermanas de `BENEFICIOS`; Promotions no depende de un CTA en Rewards. Las referencias Figma son guía visual/productiva subordinada al contrato aprobado, arquitectura vigente y UX mobile.

---

## 6. Interacción informativa

Promotions es read-only de negocio. Cada card presenta título, beneficio, un resumen de vigencia y `Ver detalles`. Esta acción abre un modal de presentación con los `details` existentes: elegibilidad, canal, combinación, vigencia y disponibilidad. Solo una promoción puede estar abierta a la vez y cerrar el modal no modifica datos, no usa mutation ni persiste información.

`MockPromotionsService` entrega datos frontend/mock disponibles detrás del boundary. La UX presenta esta información de forma completa sin afirmar una integración comercial real.

## 7. Exclusiones

No incluir:

```text
promotionId Backend
ratePlanId
eligibility engine
couponCode
discount numeric calculation
currency
availability engine
inventory
booking mutation
apply promotion mutation
stacking engine
```

`−5%` permanece `benefitText`.

`DIRECT_APP` permanece texto de presentación; no se convierte en enum contractual salvo futura autoridad.

---

## 8. Pruebas

- resumen aplicable;
- una promoción dummy;
- card resumida y `Ver detalles`;
- detalle modal, cierre y selección de otra promoción;
- details exactos;
- mapper;
- UI sin DTO/fixtures;
- loading;
- error;
- offline;
- retry;
- navegación drawer BENEFICIOS/Account;
- shell compartido.

---

## 9. Aprobación

Como resultado de esta aprobación:

```text
IMP-AND-0302
PENDIENTE → READY
```
