# Fase 3C — BFF de mutaciones administrativas Staff

Fecha: 2026-10-22. Rama: `feature/staff-admin-read`.
**Estado: COMPLETADA; aceptación global QA PASS autorizada por el usuario (2026-10-22).**
Autorización expresa de este incremento; no aprueba globalmente el contrato53.
Backend3B-1 permanece COMPLETADA con su QA manual y automatizada propias en
[QA54](../../../backend/docs/54_STAFF_ADMIN_MUTATIONS_QA.md). Backend2A y BFF2B
conservan EN_QA independiente; Web2C permanece COMPLETADA con sus salvedades.
No completa BE-006B/C ni BE-014A. No implementa UI de mutaciones ni 3D.

## Cierre autorizado — aceptación QA PASS

El usuario autorizó expresamente registrar **Fase3C COMPLETADA**, con aceptación
QA PASS. La confirmación se limita a las ejecuciones manuales enumeradas abajo;
no convierte toda la matriz de referencia en pruebas manuales realizadas.
La entrega técnica anterior EN_QA, sus comandos y resultados automatizados se
conservan como evidencia histórica. No se reejecutan suites por este cierre documental.

| QA manual confirmada por el usuario | Resultado |
| --- | --- |
| Login SUPER_ADMIN mediante Next.js BFF | PASS |
| Lectura de usuarios Staff con cookies de sesión | PASS |
| Modificación y persistencia de correo | PASS |
| No-op con changed=false | PASS |
| Conflicto de versión409, conservando los datos | PASS |
| Cambio de rol a AUDITOR mediante PUT membership | PASS |
| Suspensión SUSPENDED | PASS |
| Baja lógica DISABLED | PASS |
| Reactivación ACTIVE rechazada con400 | PASS |
| Modificación de correo sobre DISABLED rechazada con409 | PASS |
| Modificación de membership sobre DISABLED rechazada con409 | PASS |
| Solicitud sin autenticación rechazada con401 | PASS |
| Solicitud con Origin externo rechazada con403 | PASS |

**No completadas manualmente en esta sesión:** Origin ausente, permisos con otra
cuenta RECEPCION activa, desconexión temporal con respuesta503 y MSW activo.
Se conserva su cobertura automatizada reportada en la entrega técnica: validación
Origin, rechazo RECEPCION, transporte/timeout/resultado incierto y boundary MSW
con worker activo. No se les atribuye PASS manual ni se inventan nuevas ejecuciones.
Esta distinción no altera la aceptación global QA PASS expresamente autorizada.

**Evidencia automatizada conservada, no reejecutada:**382 focalizadas PASS;
2052 pruebas frontend PASS mediante npm run check; builds con mocks activados y
desactivados PASS;156 comprobaciones de integración PASS. Los detalles de lint,
typecheck y recorridos HTTP/Firefox permanecen en la sección de verificación.
No se atribuyen al usuario estas pruebas automatizadas ni CI remoto.

Cierre exclusivamente documental de3C.3B-1 permanece COMPLETADA;
3B-2/reactivación sigue BLOQUEADA por M08; Backend2A y BFF2B conservan EN_QA
independiente.3D permanece PENDIENTE, sin implementación ni autorización de inicio
por este cierre. BE-006B/C y BE-014A no se completan por arrastre. Sin código,
commit, push ni merge; cambios locales previos conservados.

## Fuentes y alcance

Subincremento BE-006 autorizado después de 3B-1, owner Web WEB-2, reviewer WEB-3.
La fila IMP-WEB-0901 del XLSX corresponde a la demostración de roles/permisos;
no se redefine ni modifica ese backlog. Fuentes contrastadas: contratos C1/C2/C4/
C6, [53](../../../backend/docs/53_STAFF_ADMIN_MUTATIONS_CONTRACT_PROPOSAL.md),
controllers/parser/servicios reales de 3B-1, QA51/52/54/64/65 y arquitectura Web.
Se consultó la documentación Route Handlers del Next instalado.

| BFF mismo origen | Backend fijo | Body estricto |
| --- | --- | --- |
| PATCH /api/staff/admin/users/{id} | PATCH /api/v1/staff-admin/users/{id} | workEmail, expectedVersion |
| PUT /api/staff/admin/users/{id}/membership | PUT /api/v1/staff-admin/users/{id}/membership | roleCode, propertyIds, expectedVersion |
| PATCH /api/staff/admin/users/{id}/status | PATCH /api/v1/staff-admin/users/{id}/status | status, expectedVersion |

Query: `scope=PROPERTY&propertyId=UUID` o `scope=ALL_PROPERTIES`, exactamente como
GET detalle. ID UUID canónico, sin query desconocida/duplicada, organizationId,
cursores o filtros de listado en comandos. No fallback de scope ni propiedad fija.
Se conserva íntegra la función GET existente; únicamente cambia Allow del recurso
de detalle a `GET, PATCH`. Subrutas permiten solo PUT o PATCH, respectivamente.
POST/DELETE/HEAD/OPTIONS y demás métodos no admitidos devuelven405, body vacío,
Allow explícito y no-store. GET catálogo/listado permanece sin modificaciones.

## DTO y validación

- JSON objeto plano, claves exactas; rechaza campos desconocidos, duplicados
  incluso escapados, JSON malformado, objetos anidados, tipos o enums incorrectos.
- expectedVersion obligatorio, entero JSON no negativo hasta9007199254740990;
  no strings, decimales ni notación exponencial, según parser Backend.
- workEmail reutiliza la normalización y validación del login Web existente:
  trim/lowercase, patrón compartido y máximo50 después de normalizar. Se extrajo
  la función de correo sin alterar reglas de contraseña/login ni añadir un
  filtro ASCII. Backend conserva su propia validación definitiva. Lectura320
  intacta; no se modifica información persistida al leer.
- roleCode permite GERENCIA/RECEPCION/OPERACIONES/AUDITOR. SUPER_ADMIN y roles
  inventados se rechazan400. propertyIds exige array de UUID sin duplicados
  después de normalizar; no infiere propiedades. Conjunto vacío se remite sin
  modificación para que Backend aplique M07 según estado, actor y scope.
- status admite únicamente SUSPENDED/DISABLED. ACTIVE se rechaza400 localmente;
  reactivación3B-2 sigue bloqueada por M08.
- Content-Type application/json; otro tipo415/INVALID_REQUEST. Límite real de
  65536 bytes UTF-8 leídos del stream, independiente de Content-Length; exceso413.

Ejemplos contractuales, no fixtures persistidas:

```json
{"workEmail":"recepcion@hotel.example","expectedVersion":7}
```
```json
{"roleCode":"AUDITOR","propertyIds":["22222222-2222-4222-8222-222222222222"],"expectedVersion":8}
```
```json
{"status":"SUSPENDED","expectedVersion":9}
```

Respuesta única200 application/json, proyección allowlist de cuatro campos:

```json
{"organizationId":"33333333-3333-4333-8333-333333333333","staffUserId":"11111111-1111-4111-8111-111111111111","version":10,"changed":true}
```

Se comprueban ambos UUID, ID objetivo, booleano y versión entera segura:
expectedVersion+1 si changed=true, misma versión si false. No StaffView ni GET
implícito posterior, incluso si membership retira al objetivo del scope seleccionado.
El acuse confirmado no asegura autorización para leer después. Se descartan
campos/headers adicionales, incluidos Set-Cookie y posibles secretos de upstream.

## Sesión, origen y transporte

Solo pms_staff_access de cookies Staff HttpOnly mediante helper existente. Sin
esa cookie401 local, incluidos Guest o refresh-only; se ignora Authorization del
navegador. Cookie presente no acredita autorización: Spring valida sesión,
STAFF_MANAGE, organización, visibilidad completa, restricciones de SA/GERENCIA,
propiedades y expectedVersion. No consulta preflight duplicada ni permisos
inferidos del nombre del rol. Parámetros inválidos con cookie presente se rechazan
localmente sin consultar datos; el estado efectivo de la sesión se verifica en
Backend cuando la solicitud es válida.

Origin debe existir y coincidir exactamente con el origen canónico de
PMS_WEB_PUBLIC_URL (default de desarrollo http://localhost:3001); null, ausente,
externo o similar se rechaza403. No se deriva confianza de Host/forwarded headers.
Se reutiliza el patrón de origen existente con exigencia explícita en comandos.
No CORS nuevo ni excepción CSRF para pruebas. Configurar el origen público real
también en despliegues con proxy.

backendStaffRequest usa PMS_BACKEND_INTERNAL_URL y una ruta fija. Bearer solo
servidor-servidor desde la cookie, sin reenviar cookies Guest/Staff ni headers de
organización aportados por el cliente. redirect:error; AbortSignal del cliente
combinado con plazo de10s. Ningún token en DTO, log o JavaScript del navegador.
No emisor JWT, cookies nuevas, revocación Next ni segundo sistema de autenticación.

Todas las respuestas, errores y405 llevan Cache-Control private,no-store. No se
almacena respuesta administrativa en BFF/localStorage ni se usa una query de
lectura como caché de comandos. La caché UI existente queda intacta en esta fase.

## Errores y resultado incierto

Problem JSON allowlist: type=about:blank, title estático, status, code;
Content-Type application/problem+json. Nunca propaga detail, SQL, host, stack,
datos del objetivo, cookies ni headers internos.

| HTTP | code |
| --- | --- |
| 400 | INVALID_REQUEST |
| 401 | STAFF_SESSION_REQUIRED |
| 403 | STAFF_ACCESS_DENIED |
| 404 | STAFF_USER_NOT_FOUND |
| 409 | STAFF_VERSION_CONFLICT / STAFF_EMAIL_CONFLICT / STAFF_STATE_CONFLICT |
| 413 / 415 | INVALID_REQUEST |
| 503 | STAFF_WRITE_UNAVAILABLE |

Se conserva status/código Backend cuando ambos son contractuales y consistentes.
Estado inesperado, código desconocido, JSON/media/acuse inválido, caída, timeout
o redirección producen503 sanitizado, conforme53. Leer upstream también está
limitado a64KiB. Un401/403 Backend conserva la pérdida de sesión/permisos; no
crea otra sesión ni modifica cookies para intentar recuperar el comando.

**Una sola llamada interna por comando. Sin refresh+retry ni replay automático.**
Todo503 debe tratarse conservadoramente como resultado potencialmente incierto:
puede haberse confirmado la escritura antes de perderse/interpretarse el acuse.
No afirma rollback. En3D conservar borrador, recuperar explícitamente mediante
GET autorizado y comparar versión/valores antes de ofrecer otra operación. No
usar staffBffRead para PATCH/PUT: su recuperación/reintento de lectura no aplica.
Un200 mínimo confirmado se conserva como éxito aunque un GET posterior dé404
por retirada de propiedad; no reconstruir StaffView ni volver a enviar el comando.

## MSW

pmsMockServiceWorker.js añade exclusiones acotadas a estos PATCH/PUT same-origin,
antes del worker generado. stopImmediatePropagation, sin respondWith ni mock de
persistencia. UUID/query inválidos también llegan al BFF para validación. Otros
métodos, endpoints, credenciales y orígenes mantienen el boundary anterior.
No cambia el worker generado ni se agrega un catálogo de usuarios paralelo.

Los únicos handlers nuevos son test-only, dentro de mutation-msw.test.ts, con
http.patch/http.put y acuses/errores reales de contrato, no exportados al runtime.
Cubren cambio/no-op/400/401/403/404/409/503 y red/acuse perdido. Con mocks=true y
false el módulo integrado sigue consumiendo Backend real, sin sustitución silenciosa.

## Archivos de este incremento

- Nuevos en src/app/api/staff/admin/: mutation.dto.ts, mutation-contract.ts,
  mutation-proxy.ts, mutation-proxy.test.ts y mutation-msw.test.ts.
- Nuevo users/[id]/membership/route.ts y users/[id]/status/route.ts; ampliado
  users/[id]/route.ts con PATCH, manteniendo GET; proxy.test.ts ajusta solo405/Allow.
- src/lib/login-input.ts extrae validador de correo existente para reutilizarlo.
- public/pmsMockServiceWorker.js y src/data/mocks/worker-boundary.test.ts.
- Esta66, adenda de23_MOCK_API.md, AlanPlan y AlanHandoff.

Sin Backend, migraciones, dependencias, contratos53/QA54, UI, módulos Staff/Auth/
Properties, shell, tabla de tres columnas ni hooks/services de lectura modificados.
Se conservan todos los cambios locales previos por snapshot SHA-256, incluidos
los archivos de Backend y de lectura aún sin commit.

## Verificación ejecutada por el agente

| Verificación | Resultado ejecutado |
| --- | --- |
| Focalizados finales,13 archivos | **382 PASS**: rutas/DTO/errores, boundary MSW, login/refresh/logout, Staff BFF, UI de lectura, guard y scope. |
| npm run check | **PASS**: eslint --max-warnings=0, tsc --noEmit, **2052 tests/301 archivos PASS**, next build. |
| Build explícito NEXT_PUBLIC_USE_MOCK_API=false | **PASS**, incluye rutas de comandos. |
| Build explícito NEXT_PUBLIC_USE_MOCK_API=true | **PASS**, incluye rutas de comandos. |
| npm run typecheck después de ambos builds | **PASS**. |
| HTTP → Next producción → JAR Spring → PostgreSQL17 aislado, mocks=false | **55 aserciones PASS**. |
| Mismo recorrido HTTP, mocks=true | **55 aserciones PASS**. |
| Firefox headless real vía WebDriver BiDi, mocks=false | **23 aserciones PASS**. |
| Firefox con service worker MSW realmente activo, mocks=true | **23 aserciones PASS**; escrituras nativas y estado persistido real. |
| git diff --check y preservación | **PASS**; sin pérdida de archivos ni cambios Backend/UI ajenos al alcance. |

HTTP comprueba login, HttpOnly/Secure, 401 sin sesión/Guest/inválida, RECEPCION403,
origen ausente/externo403, objetivo de otra organización404, scope inválido400,
método405, correo normalizado/no-op/409, membership, suspensión por GERENCIA,
DISABLED, lectura posterior, terminalidad y logout/revocación. Firefox añade
cookies inaccesibles desde document.cookie, recorrido de los tres comandos,
no-store/acuse/versiones, reactivación rechazada y persistencia con MSW activo.
No se atribuye estas pruebas al usuario ni a CI remoto.

Pruebas de contrato verifican además tamaño/media type, duplicados/campos,
UUID/roles/versión/estados, errores sin secretos ni logs de credenciales, sesión
revocada403/401 propagada, un solo despacho ante timeout/cancelación/acuse inválido,
sin refresh ni retries. Las carreras/rollback Backend conservan la evidencia de
QA54; **no se reejecutó Maven/915 tests** porque no se cambió Backend.

Se corrigió un error TypeScript de narrowing en el parser durante la primera
verificación. Los fallos iniciales de comandos QA (cwd npm, nombre temporal
http.py, perfil Firefox ausente y puerto sandbox) fueron corregidos en el entorno
de pruebas; no se presentan como PASS ni motivaron excepciones de seguridad.

Evidencia local efímera: /tmp/pms-staff-bff-mutations-qa/: check.log,
focused-final.log, build-false.log, build-true.log, typecheck-final.log,
http-false.json/http-true.json, browser-false.json/browser-true.json,
initial.json y preservation.json. Scripts integration.py/browser.mjs y fixtures
SQL/JSON reproducen los recorridos técnicos mientras ese directorio exista.
Contenedores propios pms_staff_bff_mutations_qa, DB tmpfs sin puerto host;
Backend/JAR montado solo lectura, Java21, puerto18093; Next propio3006. Datos
sintéticos, sin producción ni DB habitual; servicios propios retirados al terminar.

Comandos Web ejecutados desde frontend/pms-hotel-web/:

```bash
npm run check
npm run test -- src/app/api/staff/admin src/data/mocks/worker-boundary.test.ts src/app/api/auth src/lib/http/staff-bff.test.ts src/modules/staff/staff-admin.test.tsx 'src/app/(private)/staff-admin-navigation.test.tsx' 'src/app/(private)/staff-shell-scope.test.tsx' src/lib/login-input.test.ts
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18093 PMS_WEB_PUBLIC_URL=http://localhost:3006 npm run build
NEXT_PUBLIC_USE_MOCK_API=true PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18093 PMS_WEB_PUBLIC_URL=http://localhost:3006 npm run build
npm run typecheck
git diff --check
```

## Procedimiento de QA manual de referencia — ejecución confirmada arriba

1. Crear **otro** proyecto PostgreSQL descartable siguiendo exactamente el bloque
   de arranque manual de QA54 (pms_staff_mutations_manual, puerto18092, demo=true,
   JAR ya validado). No usar las fixtures terminales de una corrida anterior.
   Los datos/credenciales demo y administrador sintético están en ese procedimiento.
2. Desde frontend/pms-hotel-web/, build y arranque locales con mocks=false:

```bash
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18092 PMS_WEB_PUBLIC_URL=http://localhost:3006 npm run build
NEXT_PUBLIC_USE_MOCK_API=false PMS_BACKEND_INTERNAL_URL=http://127.0.0.1:18092 PMS_WEB_PUBLIC_URL=http://localhost:3006 node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3006
```

3. Abrir Firefox en http://localhost:3006/acceso. Login SA sintético de QA54 por
   el flujo existente. En DevTools/Red comprobar cookies HttpOnly y que el body
   de login no entrega tokens. No copiar cookies/tokens a logs o evidencias.
4. En la consola del mismo origen definir solo esta utilidad de QA. Usa las
   cookies del navegador; no recibe tokens ni reintenta errores:

```javascript
async function staffQA(method, path, body) {
  const response = await fetch(path, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, cache: response.headers.get('cache-control'),
    body: await response.json() };
}
const qaPage = await staffQA('GET', '/api/staff/admin/users?scope=ALL_PROPERTIES&username=pms_demo_reception');
const qaTarget = qaPage.body.items.find(user => user.username === 'pms_demo_reception');
const qaPath = `/api/staff/admin/users/${qaTarget.id}`;
const qaScope = '?scope=ALL_PROPERTIES';
```

Elegir únicamente pms_demo_reception de **esta base descartable**. Comprobar
qaTarget no es el administrador. Cada comando se ejecuta individualmente y con
la versión leída explícitamente; no pegar un bucle que reintente escrituras.

```javascript
await staffQA('PATCH', qaPath + qaScope, {
  workEmail: 'qa.manual.bff@example.test', expectedVersion: qaTarget.version,
});
await staffQA('GET', qaPath + qaScope);
```

| Escenario manual | Acción exacta / evidencia | PASS / FAIL |
| --- | --- | --- |
| Correo | PATCH anterior y GET; observar Red/body/no-store |200 con cuatro claves, changed=true, version+1 y correo persistido; sin secretos. |
| No-op/conflicto | Repetir correo con versión vigente del GET; después usar versión anterior |200/false/misma versión;409 STAFF_VERSION_CONFLICT, nunca retry automático. |
| Membership | staffQA('PUT', qaPath+'/membership'+qaScope, {roleCode:'AUDITOR', propertyIds:qaTarget.propertyIds, expectedVersion:VERSION_VIGENTE}) |200 mínimo y rol confirmado mediante GET. Reemplazar VERSION_VIGENTE explícitamente por el entero leído. |
| Suspensión | staffQA('PATCH', qaPath+'/status'+qaScope, {status:'SUSPENDED', expectedVersion:VERSION_VIGENTE}) |200; GET SUSPENDED. No hay reactivación. |
| Baja | Misma petición status DISABLED con versión vigente |200; GET DISABLED. Otro cambio de contacto409; ACTIVE400. No borrado físico. |
| Origen | Desde terminal sin cookies: curl -i -X PATCH 'http://localhost:3006/api/staff/admin/users/ID_REAL?scope=ALL_PROPERTIES' -H 'Content-Type: application/json' --data '{"workEmail":"qa@example.test","expectedVersion":0}' ; con sesión usar DevTools «Editar y reenviar» de PATCH: quitar Origin o sustituir por https://foreign.invalid, sin compartir headers |401 sin cookie;403 con sesión/origen incorrecto, sin cambiar target; luego GET confirma versión. |
| Permiso | Logout SA, login demo RECEPCION de QA54 y repetir comando sobre fixture |403, sin cambio ni detalles del objetivo. |
| Guest / sin sesión | Logout Staff; acceso Guest o sin cookies Staff, misma petición |401, sin datos administrativos. |
| Error temporal | Con sesión válida detener solo el proceso Backend QA propio; enviar un comando y después consultar Red |503 STAFF_WRITE_UNAVAILABLE, una petición, no afirma rollback ni reintenta. Reiniciar QA y GET explícito antes de otro intento. |
| MSW activo | Repetir build/arranque con true y fixtures nuevas; comprobar worker activo en Firefox y persistencia mediante GET/SQL de QA54 |La solicitud llega a Next/Spring, no recibe acuse mock; mantener misma semántica. |

La consola puede restringir pegado por protección propia de Firefox; los mismos
requests se pueden enviar con «Editar y reenviar» del panel Red sin crear UI.
No exportar HAR sin sanitizar. Retirar solo servicios QA propios según54 al acabar.
La confirmación del usuario para EN_QA→COMPLETADA ya fue recibida y se registra
al inicio. Solo los trece escenarios enumerados allí tienen PASS manual; Origin
ausente, otra cuenta RECEPCION activa, desconexión503 y MSW activo conservan
cobertura automatizada, sin ejecución manual completada en esta sesión. Este
procedimiento permanece como referencia, no como evidencia de ejecución íntegra.
CI remoto sigue NO ACREDITADO.

## Pendientes y preparación de3D

- Aceptación global QA PASS recibida y3C COMPLETADA; las cuatro comprobaciones
  manuales no completadas se distinguen arriba de su cobertura automatizada.
  Los recorridos HTTP/Firefox de la entrega técnica siguen siendo automatizados.
- 3D requiere autorización: cliente de comandos sin retry, errores tipados y
  recuperación GET explícita; invalidación del listado/detalle del contexto vigente
  tras acuse confirmado, sin mostrar otra identidad/propiedad y sin simular éxito.
- Mantener tres columnas Usuario/Acceso/Asignación, edición de un grupo por vez,
  correo separado de membership (no atomicidad HTTP ficticia), borradores y409.
  Expansión por clic fuera de controles; baja por deslizar/revelar/seleccionar/
  confirmar y alternativa accesible en las celdas, sin cuarta columna.
- 3B-2 sigue bloqueada por M08. No alta/reset/invitación, sesiones BE-006C ni
  CRUD de roles; no prometer credenciales recuperables ni acciones futuras activas.
- Backend2A/BFF2B y limitaciones QA2C no cambian. No nueva inspección visual ni
  pruebas manuales de accesibilidad atribuidas a esta fase sin UI modificada.
