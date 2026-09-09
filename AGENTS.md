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
- Web, Android y Backend viven como aplicaciones/proyectos dentro del monorepo.
- Cada subproyecto puede tener su propio `AGENTS.md`.
- Las reglas globales siempre se leen antes de las específicas.

### MUST NOT
- No ejecutar `git init` dentro de `frontend/pms-hotel-web`.
- No ejecutar `git init` dentro de `frontend/pms-hotel-android`.
- No ejecutar `git init` dentro de `backend`.
- No convertir subcarpetas en repositorios anidados.

---

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

Luego leer el `AGENTS.md` específico del área.

### Web
`frontend/pms-hotel-web/AGENTS.md`

### Android
`frontend/pms-hotel-android/AGENTS.md`

### Backend
`backend/AGENTS.md`

---

## 3. Fuentes de verdad

La precedencia es:

1. Requisitos explícitos del docente.
2. Decisiones aprobadas del equipo y registradas.
3. Figma PMS Hotel Boutique V3.
4. Reglas de dominio documentadas.
5. Contratos API confirmados.
6. Código existente.

El código NO puede redefinir silenciosamente una regla superior.

---

## 4. Estado del diseño

Figma PMS Hotel Boutique V3 está cerrado funcionalmente hasta:

`V3-0201 — Regresión integral V2 + V3`

La regresión final de diseño validó:
- 0 rutas V1/legacy;
- 0 controles visibles muertos;
- 0 cambios involuntarios de rol;
- 0 defectos críticos/altos abiertos;
- Web Pública, Web Privada, Android y sidebars revalidados.

---

## 5. Reglas globales de dominio

### Identidad
- Guest Auth y Staff Auth son contextos separados.
- GuestAccount y GuestProfile no son la misma entidad.
- Google es opcional para huéspedes.
- Reservar como invitado está permitido.

### Reservas
- `Reservation != ReservationStay`.
- Una Reservation puede contener N ReservationStay.
- Booking guest puede ser distinto de occupants.
- ReservationGuest vincula ocupantes con ReservationStay.
- No calcular habitaciones vendidas contando Reservation.

### Inventario y disponibilidad
- Physical Inventory != Sellable Availability.
- OOO/OOS no eliminan Room.
- ATS = Available To Sell.
- RatePlan no es dueño del inventario físico.

### Folio y pagos
- No borrar historial financiero.
- Correcciones financieras se hacen con reversos/compensaciones.
- No almacenar PAN completo ni CVV.
- Usar token/referencia/last4 cuando aplique.

### Operaciones
- Housekeeping y Maintenance tienen lifecycles propios.
- Resolver Maintenance no vuelve vendible una habitación automáticamente si HK readiness sigue pendiente.
- Recepción es el único canal externo directo con huésped.
- Housekeeping, Maintenance y Conserjería reportan internamente a Recepción.

### Multi-property
- Property scope siempre es explícito cuando aplica.
- `ALL_PROPERTIES` significa todas las propiedades autorizadas a la sesión, no todas las del tenant.
- Cambiar property scope NO cambia el rol.

### Integraciones
- Procesamiento idempotente.
- Retry no debe duplicar Reservation, Payment, FolioCharge ni efectos de inventario.
- Correlation e idempotency son conceptos distintos.

### Auditoría
- AuditTrail sensible es append-only.
- Registrar actor, acción, entidad, motivo, fecha/hora, origen y correlation cuando aplique.

---

## 6. Reglas para Codex

Antes de escribir código Codex DEBE:

1. inspeccionar el árbol;
2. leer AGENTS global;
3. leer docs globales relevantes;
4. leer AGENTS del subproyecto;
5. leer docs específicos del dominio;
6. verificar Definition of Ready;
7. explicar el plan;
8. indicar archivos que tocará;
9. implementar solo el alcance solicitado;
10. ejecutar DoD;
11. reportar resultados.

Codex NO DEBE:
- inventar endpoints como si fueran contratos reales;
- instalar dependencias sin justificar;
- cambiar arquitectura en una feature no relacionada;
- crear pantallas que no hayan sido pedidas;
- cambiar roles/permisos por conveniencia;
- fusionar dominios para "simplificar";
- mover componentes a shared sin evidencia de reutilización real;
- hacer refactors masivos junto con una tarea funcional pequeña.

Ante una ambigüedad de negocio:
`STOP -> documentar -> pedir aclaración`.

---

## 7. Cambios que requieren decisión arquitectónica

Registrar en `docs/11_ARCHITECTURAL_DECISIONS.md` si se cambia:

- estructura del monorepo;
- framework principal;
- Route Groups Web;
- arquitectura Service/DTO/Mapper/Domain/UI;
- estrategia de state/query;
- estrategia de mocking;
- contratos cross-app;
- modelo de Property Scope;
- permisos/roles;
- política de datos sensibles;
- estrategia de testing;
- dependencia estructural importante.
