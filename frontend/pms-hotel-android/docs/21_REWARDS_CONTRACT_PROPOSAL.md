# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0301

## Rewards

**Tarea:** `IMP-AND-0301 — Rewards`  
**Estado:** `APPROVED`  
**Autoridad visual:**  
- `576:300 — MOB-16 — Rewards / Loyalty`
- `1163:360 — MOB-V3 — Rewards / Loading`
- `1163:379 — MOB-V3 — Rewards / Error`
- `1163:398 — MOB-V3 — Rewards / Offline`

**Reviewer:** `WEB-2`  
**DoR objetivo:** `Rewards frontend/mock contract approved`

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

Desde Cuenta:

```text
Rewards · Silver · 3/8 hacia Gold
→ Rewards
```

Dentro de Rewards:

```text
← Mi cuenta
Ver servicios
Ver promociones aplicables
```

Cuenta debe permanecer la tab activa porque Rewards es una subruta del dominio Cuenta, salvo que la arquitectura de rutas aprobada determine otra cosa explícitamente.

No crear una quinta tab.

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
- navegación Rewards → Services;
- navegación Rewards → Promotions;
- shell compartido.

---

## 8. Aprobación

Como resultado de esta aprobación:

```text
IMP-AND-0301
PENDIENTE → READY
```
