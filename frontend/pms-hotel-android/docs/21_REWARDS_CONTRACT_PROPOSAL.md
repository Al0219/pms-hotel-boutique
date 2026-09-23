# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0301

## Rewards

**Tarea:** `IMP-AND-0301 — Rewards`  
**Estado:** `APPROVED`  
**Referencias visuales (guía de producto/UI):**
- `576:300 — MOB-16 — Rewards / Loyalty`
- `1163:360 — MOB-V3 — Rewards / Loading`
- `1163:379 — MOB-V3 — Rewards / Error`
- `1163:398 — MOB-V3 — Rewards / Offline`

**Reviewer:** `WEB-2`  
**DoR:** `PASS — Rewards frontend/mock contract approved`
**Implementación:** `COMPLETADA`
**QA automatizada:** `PASS — lint, typecheck, 212 tests, Expo Doctor 21/21, Android export y Metro /status`
**QA manual:** `PASS`
**WEB-2:** `PASS`

---

## 1. Contrato propuesto

```ts
export interface RewardMetricFixtureDto {
  fixtureKey: string;
  label: string;
  valueText: string;
}

export interface RewardsFixtureDto {
  currentLevelText: string;
  progressText: string;
  activeBenefitsText: string;
  metrics: RewardMetricFixtureDto[];
}
```

Todo es texto de presentación frontend.

No se modela motor loyalty Backend.

---

## 2. Dummy data Figma

```text
Nivel actual
Silver
3 / 8 hacia Gold
3 beneficios activos
```

Métricas:

```text
5% Member Rate     Activo
Crédito            Q 150
Late checkout      14:00
Próximo nivel      Gold
Faltan             5 estadías
Noches elegibles   5
```

No convertir:

- `Q 150` → amount/currency;
- `5` → contador contractual Backend;
- `Silver/Gold` → catálogo Backend obligatorio.

---

## 3. Domain

```ts
export interface RewardMetric {
  key: string;
  label: string;
  valueText: string;
}

export interface Rewards {
  currentLevelText: string;
  progressText: string;
  activeBenefitsText: string;
  metrics: RewardMetric[];
}
```

---

## 4. Query

Estados confirmados por Figma:

### Loading

```text
Cargando Rewards
Estamos recuperando nivel y beneficios…
```

### Error

```text
Error en Rewards
Reintenta para recuperar nivel y beneficios.
Reintentar
```

### Offline

```text
Rewards sin conexión
Conéctate y reintenta para recuperar nivel y beneficios.
Reintentar
```

`NetworkError` → offline.

No mutation es necesaria para el frame actual.

---

## 5. Navegación

Desde el drawer Guest:

```text
ESTANCIA
→ Rewards
→ /account/rewards
```

Rewards mantiene ownership de Account/Inicio, pero no se muestra como launcher en `/account`. Desde cualquier raíz Guest el drawer cierra y navega a `/account/rewards`; Back retorna siempre a `/account`.

Dentro de Rewards:

```text
← Mi cuenta
```

La implementación frontend-first usa `/account/rewards` como hija de Inicio/Cuenta. Muestra `GuestChildHeader`, sin footbar, menú, drawer ni FAB Chat; Back retorna de forma segura a `/account`. La entrada de Rewards se limita al drawer Guest y no deriva datos de perfil o estadía para su presentación.

`Ver promociones aplicables` no forma parte de Rewards. Promotions tiene su propia entrada en `BENEFICIOS > Promociones` del drawer Guest, mantiene la ruta hija `/account/promotions` y queda fuera del alcance funcional de Rewards.

Las referencias Figma indicadas arriba orientan composición, jerarquía y estados; la navegación vigente, el contrato aprobado y la usabilidad frontend-first tienen prioridad ante una implementación literal incompatible.

Cuenta permanece la tab activa porque Rewards es una subruta de `/account`. No crear una quinta tab.

---

## 6. Exclusiones

No incluir:

```text
loyaltyAccountId
points
pointsBalance
tierId
benefitId Backend
eligibleNightCount numeric contract
earnRules
redeemRules
expiration
transactions
history
currency amount
```

Sin canje, acumulación, mutation ni Backend.

---

## 7. Pruebas

- level/progress/benefits visibles;
- seis métricas;
- mapper;
- UI sin DTO/fixture;
- loading;
- error;
- offline;
- retry;
- navegación Cuenta ↔ Rewards;
- shell compartido.

---

## 8. Aprobación

Como resultado de esta aprobación:

```text
IMP-AND-0301
PENDIENTE → READY
```

## 9. Implementación frontend-first

La implementación se organiza en `src/modules/rewards` con DTO local → mapper → domain → `RewardsService` → `MockRewardsService` → `useRewards` (TanStack Query) → presentación. No hay fetch, axios, Backend, persistencia, mutation ni DTO importado por UI. `NetworkError` se representa como estado offline y los estados error/offline reintentan la misma Query. El card de nivel se resuelve en presentación con tratamiento local para los tiers de texto conocidos `Silver` y `Gold`, más fallback neutral; no incorpora colores ni categorías en Domain.
