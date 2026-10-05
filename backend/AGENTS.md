# PMS Hotel Boutique — Backend

Aplica `../AGENTS.md`.

Cuando apliquen al flujo, Backend valida sesión, permisos, membership y property scope; nunca confía en UI/BFF ni filtra datos globales después de consultar. Auditoría e idempotencia donde apliquen; no PAN/CVV.

Al tocar identidad o reservas, preservar separaciones Guest/Staff, GuestAccount/GuestProfile y Reservation/ReservationStay. DTOs/mocks frontend no definen API Backend; no copiar modelos UI a persistencia sin análisis.

Para tarea nueva: buscar **solo su sección** y «Control operativo, DoR y DoD comunes» en `docs/AlanPlan.md`; verificar dependencias, owner/reviewers, aceptación y contrato. Consultar la entrada pertinente o estado reciente de `docs/AlanHandoff.md`.

Las revisiones de otros owners/reviewers son colaborativas y no bloquean el avance ni el cierre técnico si la evidencia del DoD está completa. Solo son bloqueantes si el docente las exige explícitamente, branch protection o política del repositorio exige aprobación, existe contradicción real entre fuentes de verdad, o falta una decisión de negocio necesaria que no esté registrada en una fuente de verdad aprobada. Codex no infiere ni inventa decisiones de producto. Registrar hallazgos concretos y escalar solo esos casos; no dejar tareas pendientes únicamente por una revisión sin respuesta.

`docs/AlanPlan.md` y `docs/AlanHandoff.md` son el control operativo Backend, no el XLSX.

Para determinar estado, READY, siguiente tarea o dependencias Backend, usar primero `AlanPlan.md` y `AlanHandoff.md`. No consultar el backlog global/XLSX ni `docs/12_BACKLOG_AND_DELIVERY.md` salvo que AlanPlan los referencie para esa decisión o exista una contradicción que requiera verificarlos.

Inspeccionar código y tests afectados. Cerrar técnicamente con tests automatizados relevantes PASS, suite/CI aplicable PASS, QA manual PASS del owner de la tarea, contratos/docs aplicables consistentes y validaciones de seguridad, property scope e integración cuando correspondan. La implementación permanece EN_QA hasta que el usuario ejecute el QA manual aplicable y confirme el resultado PASS; solo entonces puede marcarse COMPLETADA. Esta confirmación no requiere aprobación de otros owners/reviewers. Commit, push y merge requieren autorización explícita. Actualizar plan/handoff al cambiar estado o entregar evidencia: entrada breve con estado, pruebas, bloqueos y siguiente paso; sin transcripciones. No avanzar a otra tarea sin autorización.

## Router Backend (`docs/`)

| Tema | Archivo |
| --- | --- |
| arquitectura/API | `01_BACKEND_ARCHITECTURE_TODO.md`, `02_API_CONTRACT_POLICY.md` |
| auth/scope | `03_AUTH_AND_SCOPE.md`, `06_SECURITY.md` y contrato C2/C3 aplicable |
| persistencia/migraciones | `04_PERSISTENCE_RULES.md` |
| idempotencia/auditoría | `05_IDEMPOTENCY_AND_AUDIT.md` |
| pruebas/QA | `07_TESTING_STRATEGY.md`, guía de la tarea |

Buscar otros contratos por ID/módulo y verificar aprobación.

Abrir docs globales de dominio, seguridad, scope o cross-app **solo si el cambio los afecta**.

Antes de crear o modificar una API, confirmar únicamente lo necesario para esa tarea:
- contrato;
- auth/permisos si aplican;
- property scope si aplica;
- persistencia si aplica;
- idempotencia/auditoría si aplica;
- pruebas/QA requeridas.

Detenerse antes de:
- inventar contratos, endpoints, permisos, roles, estados o reglas de negocio;
- modificar migraciones ya aplicadas sin autorización;
- modificar secretos;
- introducir dependencias externas sin justificación/aprobación;
- hacer commit, push o merge;
- avanzar a otra tarea sin autorización explícita.
