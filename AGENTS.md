# PMS Hotel Boutique — AGENTS global

Este archivo gobierna TODO el monorepo.

## 1. Estructura del monorepo

Debe existir un único repositorio Git en la raíz:

```text
pms-hotel-boutique/
├── frontend/
│   ├── pms-hotel-web/
│   └── pms-hotel-android/
├── backend/
├── docs/
├── .github/
└── AGENTS.md
```

### MUST
- Un solo `.git` en `pms-hotel-boutique/`.
- Web, Android y Backend viven dentro del mismo monorepo.
- Las reglas globales se leen antes de las específicas.

### MUST NOT
- No ejecutar `git init` dentro de Web, Android o Backend.
- No convertir subcarpetas en repositorios anidados.

## 2. Orden de lectura obligatorio

Antes de modificar cualquier archivo:

1. `docs/00_PROJECT_CONTEXT.md`
2. `docs/01_SOURCE_OF_TRUTH.md`
3. `docs/02_BUSINESS_GLOSSARY.md`
4. `docs/03_DOMAIN_MODEL.md`
5. `docs/04_DOMAIN_RULES.md`
6. `docs/05_PROPERTY_SCOPE.md`
7. `docs/06_TEAM_STRUCTURE.md`
8. `docs/07_CROSS_APP_CONTRACTS.md`
9. `docs/08_SECURITY_PRIVACY.md`
10. `docs/09_GIT_WORKFLOW.md`
11. `docs/10_CHANGE_CONTROL.md`
12. `docs/11_ARCHITECTURAL_DECISIONS.md`
13. `docs/12_BACKLOG_AND_DELIVERY.md`
14. `docs/Backlog_Implementacion_PMS_V1.xlsx`

Luego leer el `AGENTS.md` específico del área.

### Web
`frontend/pms-hotel-web/AGENTS.md`

### Android
`frontend/pms-hotel-android/AGENTS.md`

### Backend
`backend/AGENTS.md`

## 3. Fuentes de verdad

1. Requisitos explícitos del docente.
2. Decisiones aprobadas y registradas.
3. Figma PMS Hotel Boutique V3.
4. Reglas de dominio documentadas.
5. Contratos API confirmados.
6. Backlog operativo para secuencia/ownership/DoR/DoD.
7. Código existente.

El backlog organiza el trabajo, pero no puede contradecir una fuente superior.

## 4. Reglas globales no negociables

- Guest Auth y Staff Auth son contextos separados.
- `GuestAccount != GuestProfile`.
- `Reservation != ReservationStay`.
- Una Reservation puede contener N ReservationStay.
- Physical Inventory != Sellable Availability.
- RatePlan no posee inventario físico.
- OOO/OOS no eliminan Room.
- Historial financiero y AuditTrail sensible son append-only/compensatory.
- No almacenar PAN completo ni CVV.
- Property scope es explícito cuando aplica.
- `ALL_PROPERTIES` significa propiedades autorizadas a la sesión.
- Retry de integración no debe duplicar entidades ni side effects.

## 5. Codex

Antes de escribir código Codex DEBE:

1. leer las fuentes anteriores;
2. localizar la tarea exacta del backlog;
3. verificar dependencias y DoR;
4. indicar plan/archivos;
5. implementar solo el alcance autorizado;
6. ejecutar acceptance + DoD;
7. detenerse ante contradicción real.

Codex NO DEBE inventar endpoints, Node IDs de Figma, contratos confirmados, permisos, roles o reglas de negocio.
