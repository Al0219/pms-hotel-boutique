# PMS Hotel Boutique — AGENTS global

Monorepo: `frontend/pms-hotel-web/`, `frontend/pms-hotel-android/`, `backend/`, `docs/`; único `.git` en raíz. Aplican este archivo y el AGENTS del área. No crear repositorios anidados.

## Autoridad

Docente > decisiones aprobadas > Figma V3 > dominio documentado > API confirmada > código (`docs/01_SOURCE_OF_TRUTH.md`). Backlog: secuencia, ownership, DoR/DoD; no altera la precedencia. Contradicción real: detener el alcance afectado, citar fuentes y solicitar decisión (`docs/10_CHANGE_CONTROL.md`). No inventar reglas, contratos, endpoints, permisos, roles, estados ni Node IDs. DTOs/mocks frontend no confirman API Backend.

## Invariantes

- Guest Auth != Staff Auth; `GuestAccount != GuestProfile`.
- `Reservation != ReservationStay`; una Reservation admite N ReservationStay.
- Physical Inventory != Sellable Availability; RatePlan no posee inventario físico; OOO/OOS no eliminan Room.
- Historial financiero/AuditTrail sensible: append-only o compensatorio. Sin PAN completo/CVV.
- Property scope explícito cuando aplica; `ALL_PROPERTIES` = propiedades autorizadas a la sesión.
- Retries de integración sin duplicar entidades ni side effects.

## Router: abrir solo según tema

- Contexto/glosario: `docs/00_PROJECT_CONTEXT.md`, `docs/02_BUSINESS_GLOSSARY.md`.
- Dominio: `docs/03_DOMAIN_MODEL.md`, `docs/04_DOMAIN_RULES.md`.
- Scope/seguridad: `docs/05_PROPERTY_SCOPE.md`, `docs/08_SECURITY_PRIVACY.md`.
- Cross-app/API: `docs/07_CROSS_APP_CONTRACTS.md` y contrato específico.
- Notificaciones Cloudflare: `docs/CLOUDFLARE_NOTIFICATIONS.md`.
- Ownership/arquitectura: `docs/06_TEAM_STRUCTURE.md`, `docs/11_ARCHITECTURAL_DECISIONS.md`.
- Git/PR: `docs/09_GIT_WORKFLOW.md`. Tarea Web/Android: `docs/12_BACKLOG_AND_DELIVERY.md` y XLSX referido allí; Backend: fuente operativa de su AGENTS.

Cambio pequeño: AGENTS aplicables, código/tests afectados. Tarea nueva: localizar ID, dependencias, owner, DoR/DoD y aceptación; definir plan/archivos, implementar solo alcance autorizado y validar. Fallo CI: corregir solo su causa. Actualizar docs vinculados cuando el DoD lo exija.

Revisar `git status`; conservar cambios ajenos. Detenerse antes de modificar migraciones aplicadas o secretos, introducir dependencias externas sin justificación/aprobación, hacer commit/push/merge o avanzar a otra tarea sin autorización.

## Memoria y contexto previo

No consultar `MEMORY.md` ni memoria de sesiones previas por defecto. El estado actual del proyecto debe obtenerse de las fuentes canónicas del repositorio. Consultar memoria solo si el usuario pide recuperar contexto previo o si una referencia no puede resolverse desde el repo. La memoria nunca prevalece sobre documentación, código, contratos o estado Git actuales.

Por defecto, respuesta breve: `RESULTADO: PASS | BLOCKED | PARTIAL`; `CAMBIOS:` ≤5 puntos; `PRUEBAS:` comandos/resultados; `ARCHIVOS:` rutas; `BLOQUEOS/DECISIONES:` si existen; `SIGUIENTE:` una acción. Si el usuario pide análisis, explicación o formato distinto, seguir esa instrucción. Sin reglas repetidas ni archivos completos salvo solicitud.
