# Fase 2B — BFF de lectura administrativa Staff

Fecha: 2026-10-22. Rama: `feature/staff-admin-read`, base `a0f62d0`.
**Estado: EN_QA; confirmación manual pendiente. Backend Fase 2A permanece EN_QA.**
Integración BFF autorizada expresamente por el usuario; no aprueba globalmente
otras decisiones del módulo ni inicia UI/mutaciones. Owner Web: WEB-2; reviewer:
WEB-3. Trazabilidad: subconjunto BE-006/Fase 2B y
[contrato 51](../../../backend/docs/51_STAFF_ADMIN_READ_CONTRACT_PROPOSAL.md).
La fila IMP-WEB-0901 del XLSX corresponde a roles/permisos, no a este BFF específico;
no se modifica el XLSX ni se declara completada esa tarea.

Fuentes: [QA Backend 52](../../../backend/docs/52_STAFF_ADMIN_READ_QA.md),
[rutas](02_ROUTE_ARCHITECTURE.md), [auth/sesiones](13_AUTH_AND_SESSIONS.md),
[MSW](23_MOCK_API.md) y controllers/DTO/parser Backend realmente implementados.
Se leyó la guía Route Handlers del Next instalado antes de escribir código.

## Rutas y contrato implementados

| GET mismo origen Next.js | GET interno Spring |
| --- | --- |
| /api/staff/admin/roles | /api/v1/staff-admin/roles |
| /api/staff/admin/users | /api/v1/staff-admin/users |
| /api/staff/admin/users/[id] | /api/v1/staff-admin/users/{id} |

Mismos DTO camelCase de Backend: RolesResponse, UsersPage y UserDetail, con
organizationId, scope e items/item según contrato. Usuario: id, username,
workEmail, status, roleCode, membershipStatus, organizationId, propertyIds,
createdAt, updatedAt, version. Sin DTO de sesión editable ni RolePreview.

Roles no acepta query. Lista: scope obligatorio, propertyId solo para PROPERTY,
status/roleCode opcionales, username literal trim/case-insensitive del Backend,
limit entero 1..100 (default 50), cursor opaco no vacío de hasta 4096 caracteres.
Detalle: id UUID y solo scope/propertyId. Campos desconocidos/duplicados,
organizationId/actorId del cliente, paginación offset/page y sort se rechazan.
La validación de username respeta los controles/trim Java, sin escapar o modificar
el literal enviado. UUID se normaliza a su representación canónica; no hay
normalización de negocio de nombres/contactos.

Se conserva cursor byte a byte tras decodificar el query HTTP una vez, sin
reconstruirlo, verificar su firma ni interpretar sus datos en BFF. Backend decide
firma/TTL/contexto. BFF no añade una segunda paginación ni ordena/recorta filas:
comprueba tamaño, orden C UTF-8/id y cursor nullable según respuesta.

## Identidad, autorización y aislamiento

1. GET lee únicamente pms_staff_access mediante request.cookies. Sin cookie:
   401 sin petición interna. Header Authorization del navegador, cookies Guest,
   refresh y encabezados de organización no se reenvían como autoridad.
2. Usa backendStaffRequest existente y PMS_BACKEND_INTERNAL_URL, ruta interna
   fija, Bearer solo servidor-servidor, cache no-store y redirecciones rechazadas.
   AbortSignal combina cancelación del cliente y deadline interno de 10 segundos.
   No nuevas dependencias ni emisores/verificadores JWT.
3. Spring revalida sesión real y STAFF_MANAGE, deriva organización y aplica C4/C2
   en SQL. BFF no concede acceso por rol elegido o cookie arbitraria, ni crea
   otra consulta de autenticación/preflight. La presencia de cookie no acredita
   identidad: esa comprobación efectiva ocurre en Backend.
4. BFF valida parámetros antes de enviar al Backend. Una cookie ausente siempre
   produce 401; parámetros inválidos con cookie presente producen 400 local sin
   consultar datos. Para parámetros válidos la sesión inválida o falta de permiso
   conserva 401/403 Backend, sin refresh servidor ni cambio de cookies.
5. Proyección allowlist: UUID/enums, fechas UTC (incluida precisión de nanosegundos),
   versión entera segura, IDs duplicados/orden, organización consistente en
   envelope/usuario, scope de respuesta igual a selección y detalle del ID pedido.
   ALL exige propiedades de cada target contenidas en el scope retornado;
   PROPERTY exige pertenencia seleccionada y conserva todas las asignaciones
   devueltas. Backend sigue siendo la autoridad de visibilidad completa del actor.
6. El DTO C2 de sesión no expone organizationId: BFF no lo inventa ni lo toma de
   query/header. Se devuelve el de la respuesta administrativa de Backend. El
   módulo futuro podrá obtener su contexto con GET roles y contrastar la sesión
   y memberships vigentes en el mapper/hook, conforme contrato 51.

Las tres respuestas, incluidos errores, usan Cache-Control private,no-store.
No ETag/cache de BFF, tokens, hashes, stack, detalles SQL, headers internos ni
Set-Cookie de upstream. No CORS nuevo. GET sin side effects; no nuevo CSRF.
POST/PUT/PATCH/DELETE/HEAD/OPTIONS se rechazan explícitamente con 405, Allow GET,
body vacío y no-store, sin llamar a Backend. Esto no implementa mutaciones.

## Errores y restauración de sesión

| HTTP Browser | Código/semántica |
| --- | --- |
| 400 | INVALID_REQUEST; conservar INVALID_CURSOR cuando Backend lo informa. |
| 401 | STAFF_SESSION_REQUIRED, incluida identidad Guest/no autenticada. |
| 403 | STAFF_ACCESS_DENIED, permiso o scope rechazado por Backend. |
| 404 | STAFF_USER_NOT_FOUND, sin revelar existencia o alcance del objetivo. |
| 503 | STAFF_READ_UNAVAILABLE: 5xx, red/timeout/configuración, redirect, estado inesperado o DTO inválido. |
| 405 local | Método no soportado; sin body ni código de negocio adicional. |

Errores JSON mínimos: type=about:blank, title estático, status y code del contrato;
Content-Type application/problem+json. No copiar title/detail/body de upstream.
Un 400 desconocido se reduce a INVALID_REQUEST. 2xx distinto de 200 o página
malformada falla 503; nunca se convierte en colección vacía. Una lista realmente
vacía de Backend mantiene 200 con items=[] y nextCursor=null.
Un 405 inesperado recibido de Spring mientras se envía GET se considera transporte
no disponible (503), conforme allowlist de errores del contrato 51; no se
confunde con los métodos rechazados localmente.

El módulo futuro usará staffBffRead ya existente: primer 401 -> un refresh Staff
compartido -> un retry; segundo 401 se entrega al controlador de sesión. El BFF
no rota cookies ni llama refresh por su cuenta. No se modificaron providers,
login/logout, cookies ni la política Guest. Las pruebas nuevas confirman que un
admin GET comparte rotación con la lectura de sesión y no toca Guest.

## Mocks y límites del alcance

Los GET de las tres rutas son reales con NEXT_PUBLIC_USE_MOCK_API=true/false.
pmsMockServiceWorker.js excluye solo esos GET same-origin, incluidos slash final
y parámetros inválidos que debe resolver BFF. Corre antes del worker generado y
no llama respondWith. Otros orígenes, métodos, rutas de sesiones futuras y
simulación Private 07 conservan el comportamiento anterior.
No se modifica mockServiceWorker.js generado ni se añaden fixtures de negocio
persistentes. Las fixtures de Vitest son exclusivamente de pruebas.

No se implementó /seguridad/usuarios, alta, suspensión, edición de roles, reset,
administración de sesiones ni cache/hooks/services de UI. src/modules/staff
sigue preparado para su incremento posterior; no se amplió el DTO de sesión.
La cadena futura seguirá Service -> DTO -> Mapper -> Domain -> Hook -> UI con
APIs públicas de auth/properties. El helper servidor y sus DTO BFF locales no
deben importarse en componentes cliente ni servir como Domain editable.

## Archivos de esta fase

Rutas relativas a frontend/pms-hotel-web/ salvo seguimiento Backend explícito.

| Acción | Archivos |
| --- | --- |
| Crear handlers | src/app/api/staff/admin/roles/route.ts; users/route.ts; users/[id]/route.ts. |
| Crear transporte/DTO/proyección | src/app/api/staff/admin/proxy.ts; contract.ts; staff-admin.dto.ts. |
| Crear pruebas | src/app/api/staff/admin/proxy.test.ts; src/lib/http/staff-bff.test.ts. |
| Ampliar boundary existente | public/pmsMockServiceWorker.js; src/data/mocks/worker-boundary.test.ts. |
| Documentar | docs/64_STAFF_ADMIN_BFF_QA.md; docs/02_ROUTE_ARCHITECTURE.md; docs/23_MOCK_API.md; backend/docs/51, AlanPlan y AlanHandoff. |

Código/tests Backend de Fase 2A sin cambios, comprobados contra SHA-256 inicial
de los archivos locales. Se conservan todos los cambios previos sin commit.

## Validaciones ejecutadas (automáticas, no QA manual)

| Validación | Resultado |
| --- | --- |
| Focalizados BFF/MSW/transporte y regresiones Auth | 149 PASS en 8 archivos. |
| NEXT_PUBLIC_USE_MOCK_API=false npm run check | PASS: lint/boundaries, TypeScript, 1.871 pruebas/296 archivos y build. |
| NEXT_PUBLIC_USE_MOCK_API=true npm run build | PASS; tres rutas administrativas dinámicas presentes. |
| npm run typecheck tras generar los tipos Next | PASS. |
| HTTP real Next build mocks=false -> Spring/JAR previo -> PostgreSQL aislado | 71 comprobaciones PASS. |
| HTTP real Next build mocks=true -> mismo Spring/PostgreSQL aislado | 71 comprobaciones PASS independientes. |
| Backend verify 864 | Evidencia previa Fase 2A; no repetida ni atribuida a esta fase. |
| QA manual navegador/Postman/worker activo | PENDIENTE; no se ejecutó manualmente. |

Primer check detectó un tipo unknown demasiado amplio en el test MSW, corregido
al tipo de fixture correspondiente. No fue un defecto de auth ni de Backend.
No hubo cambios funcionales después del check final PASS.

Focalizados cubren: cookie Staff y no autoridad cliente/Guest, rutas fijas,
validaciones/duplicados, cursor opaco, formato de página y fechas, orden UTF-8,
roles fijos, errores 400/401/403/404 y fallos inesperados/503, red/deadline,
respuestas sin secretos/headers privados, 405 y mocks true/false. Regresiones
incluidas: login unificado, restauración y provider Staff, logout y Guest.

HTTP real: entorno desechable derivado del perfil compose.auth-manual-qa.yaml;
solo credenciales sintéticas de ese perfil, sin env_file de aplicación. Se usó
el JAR Backend ya validado montado read-only sobre la imagen Java 21 existente,
sin recompilar ni modificar Backend. PostgreSQL tmpfs sin puerto publicado.
Next.js temporal en 3001 y Backend en 127.0.0.1:18086. Script automatizado:
login existente, cookies HttpOnly/SameSite, sesión, tres GET, list/detail exactos,
filtros, vacío legítimo, 400/401/404, no-store/campos seguros, seis métodos
rechazados en las tres rutas, refresh existente y logout/revocación efectiva.
Tokens solo en memoria, sin imprimirlos ni guardarlos en evidencia.

Límites de esta evidencia: el runtime usa solo el bootstrap SUPER_ADMIN del
perfil existente. GERENCIA/403 y cursor positivo están cubiertos en BFF por
respuestas de contrato en Vitest y por la QA HTTP Backend previa, **no** por este
runtime bootstrap-only. MSW se verifica con harness que ejecuta ambos workers
reales; los requests Python de runtime no son una prueba de navegador con MSW.
No CI remoto ni confirmación manual atribuida al usuario.

Logs/artefactos locales: /tmp/pms-staff-admin-bff-qa/{focused.log,check.log,
build-mocks.log,typecheck-after-build.log,http-integration-mocks-false.json,
http-integration-mocks-true.json}. Entornos temporales se retiran tras la QA;
no se dejan sesiones activas usadas por el script.

## Comandos y QA manual pendiente

Desde frontend/pms-hotel-web/:

```bash
npm run test -- src/app/api/staff/admin/proxy.test.ts src/data/mocks/worker-boundary.test.ts src/lib/http/staff-bff.test.ts src/modules/auth/service/staff-session.service.test.ts src/modules/auth/components/staff-session-provider.test.tsx src/modules/auth/components/staff-logout-navigation.test.tsx src/modules/auth/service/unified-login.service.test.ts src/modules/auth/components/guest-real-session.test.tsx
NEXT_PUBLIC_USE_MOCK_API=false npm run check
NEXT_PUBLIC_USE_MOCK_API=true npm run build
npm run typecheck
```

Esperado: 149 focalizados; check 1.871 pruebas sin fallos, lint/typecheck y builds
PASS. FAIL si cambia un status contractual, se intercepta un GET real o aparecen
errores en los checks. Estado EN_QA hasta revisión y confirmación explícita.

Para revisión manual HTTP con datos sintéticos, sin usar la BD de aplicación:

```bash
# Desde raíz; puerto 18086 libre. Perfil existente con credenciales SOLO de QA.
docker compose -p pms-staff-admin-bff-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa up --build -d
# Desde frontend/pms-hotel-web/; puerto 3001 libre
PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18086 PMS_WEB_PUBLIC_URL=http://localhost:3001 NEXT_PUBLIC_USE_MOCK_API=false npm run dev
```

1. Abrir http://localhost:3001/acceso e iniciar Staff con el bootstrap sintético
   definido en compose.auth-manual-qa.yaml. No cambiar credenciales ni datos del
   entorno de aplicación. Revisar cookies Staff HttpOnly sin copiar valores.
2. En la consola del navegador ejecutar lecturas del mismo origen:

```js
const session = await fetch('/api/auth/staff/session').then(r => r.json());
const cases = [
  ['/api/staff/admin/roles', 'GET', 200],
  ['/api/staff/admin/users?scope=ALL_PROPERTIES&limit=1', 'GET', 200],
  [`/api/staff/admin/users/${session.staffUserId}?scope=ALL_PROPERTIES`, 'GET', 200],
  ['/api/staff/admin/users?scope=ALL_PROPERTIES&cursor=invalid.cursor', 'GET', 400],
  ['/api/staff/admin/users?scope=ALL_PROPERTIES&limit=0', 'GET', 400],
  ['/api/staff/admin/users', 'POST', 405],
];
const results = [];
for (const [url, method, expected] of cases) {
  const r = await fetch(url, { method });
  const noStore = (r.headers.get('cache-control') ?? '').includes('no-store');
  results.push({ url, status: r.status, expected, noStore, pass: r.status === expected && noStore });
}
console.table(results);
```

3. Revisar en Network el JSON: roles fijos, lista/detalle coherentes, ningún token,
   hash o detalle interno; errores solo envelope seguro. Logout mediante el flujo
   existente y GET roles sin sesión debe dar 401. PASS si la tabla es toda true,
   cookies/JSON son correctos y logout conserva el aislamiento; FAIL y reportar
   el request si discrepa. No confundir un 503 de entorno con una lista vacía.
4. Repetir con NEXT_PUBLIC_USE_MOCK_API=true reiniciando dev; confirmar que los
   tres GET van al BFF y no son respondidos/interceptados por el worker MSW.
   Si el navegador mantiene un worker previo, recargar para activar la versión
   actual; no cambiar políticas de auth para resolver la demostración.
5. Finalizar dev (Ctrl+C) y retirar solo el proyecto manual aislado:

```bash
docker compose -p pms-staff-admin-bff-manual-qa -f backend/compose.auth-manual-qa.yaml --profile manual-qa down
```

El perfil bootstrap no permite afirmar QA manual GERENCIA/403 ni paginación con
muchos usuarios: para esos casos reutilizar el fixture automatizado Backend
documentado en QA 52, sin inventar nuevas APIs de alta ni editar datos reales.

## Preparación del siguiente incremento

Los tres endpoints BFF están técnicamente preparados para que src/modules/staff
consuma lecturas reales con staffBffRead, DTO y mapper propios, sesión/scope y
cache aislada conforme contrato 51. Firma/TTL de cursores siguen dependiendo del
proceso Backend (15min; reinicio/otra réplica invalida cursor). UI, cache/hooks
administrativos y su QA no están implementados. Backend y BFF conservan EN_QA;
no se marca COMPLETADA ni se hace commit/push/merge por esta entrega.
