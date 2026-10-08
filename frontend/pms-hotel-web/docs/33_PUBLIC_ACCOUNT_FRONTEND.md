# Public 05 — Account, Profile, History, Rewards y Promotions

## Estado vigente — cierre QA manual final (2026-10-06)

**BE-004-ACCOUNT-SUMMARY-01: COMPLETADA.**
**BE-005-AUTH-API-01: COMPLETADA.**

Confirmación manual final real del usuario, recibida el 2026-10-06.
Las entradas anteriores se conservan como historial; sus estados EN_QA y
pendientes quedan superados por este cierre. No se atribuye esta confirmación
a pruebas automatizadas ni se ejecutan nuevas implementaciones.

- `GET /api/auth/guest/account/summary` 200: **PASS**.
- Dashboard `/cuenta` renderiza datos reales: **PASS**.
- Ausencia de perfil/reservas presentada correctamente: **PASS**.
- Logout deja summary/session en 401: **PASS**.
- QA visual del rediseño: **PASS**.

Google real → callback → `/cuenta` reconocida sin reload, Guest session/refresh/
logout/revocación y regresión Staff: **PASS** confirmado por el usuario.
Este cierre registra únicamente documentación; contratos, Backend, BFF, auth,
cookies y código de presentación permanecen intactos.

## Alcance autorizado

Corrección frontend solicitada por el usuario: puntos 15–20, IMP-WEB-0203 a 0208 y consulta de documentos vinculada desde Dashboard (0209). No Backend, JWT, cálculo de puntos, motor comercial, cargos, cancelaciones ni operaciones Staff.

Las filas del XLSX siguen PENDIENTE. Se reutiliza el acceso Guest corregido en 0202, probado por el usuario. No se modifica el backlog ni se declara completada la dependencia 0111. El reviewer de Account/Profile/History es WEB-3; Rewards/Promotions/documentos requieren WEB-4. El cierre visual y las revisiones humanas quedan pendientes.

## Contratos frontend/mock y fuentes

Se conservan las capas existentes de cada módulo y los transports provisionales `/account/summary`, `/profile/*`, `/account/history`, `/rewards`, `/promotions`. No son contratos API Backend confirmados. Los documentos usan `/__mock/account/invoices`, exclusivamente MSW. Las extensiones reflejan campos de lectura solicitados en esta tarea.

`data/mocks/account-fixtures.ts` es la fuente única de datos de demostración por GuestAccount. AccountSummary se construye desde los mismos registros que leen Perfil, Historial, Rewards, Promociones y Facturas. No se duplican nombres ni totales de negocio en páginas. Las mutaciones de Perfil conservan los IDs y actualizan el resumen al guardar.

Account y Profile siguen separados. AccountSummary devuelve una asociación explícita `profile_id`; el perfil no se deduce de account_id. Se pueden editar los campos de contacto y preferencias ya presentes en el formulario: nombre, apellido, correo de contacto, teléfono internacional, país, idioma, cama, ambiente y piso. No se edita el correo de autenticación, ExternalIdentity, privacy level ni consentimientos. La validación reproduce el formulario existente y solo sirve para la demo; Backend definirá autorización real.

Rewards añade saldo recibido e historial EARN/REDEEM/EXPIRE/REVERSE. El saldo es un fixture explícito, no se calcula a partir de reservas. Los únicos movimientos EARN se relacionan con estadías completadas; CANCELLED/NO_SHOW no generan abonos. No se ofrecen edición, canje ni generación de movimientos. Si no llega saldo/historial se representa ausencia, no un cálculo inventado.

Promotions recibe elegibilidad, vigencia, estado y resultado de combinación con motivos. Se muestran esos datos sin decidir reglas ni acumular descuentos. Un enlace a búsqueda no afirma aplicar una promoción. Fechas/estados son snapshots de demostración, no evaluación comercial con el reloj del navegador.

## Historial: pendiente de revisión WEB-3

El módulo reservations local y la referencia local origin/web3 solo exponen shells, no una API pública consumible. Se implementa una proyección de lectura Guest dentro de account para permitir las pruebas autorizadas; no se modifica el módulo WEB-3 ni se presenta como integración terminada con 0111.

- Una fila agrupa una Reservation con su ID comercial y property explícita.
- Cada Reservation conserva N stays con sus propios IDs, fechas, estado y ocupantes.
- Booking guest no se confunde con los ocupantes: el fixture multi-room contiene personas distintas en sus dos stays.
- El estado comercial y el estado de cada stay se muestran por separado; una reserva histórica confirmada puede contener un stay CHECKED_OUT. No se infiere que Reservation sea Stay.
- Los status codes son opacos para la UI; CURRENT/PAST solo clasifican la lectura Guest recibida, no añaden estados de negocio.
- La lista solo contiene reservas asociadas a la cuenta solicitada. Una búsqueda de detalle solo opera dentro de esa lista. Códigos no vinculados muestran no encontrado, sin acciones Staff ni información externa.
- Validar con WEB-3 antes de cerrar: fuente de asociación GuestAccount/Reservation, nombres definitivos del read model, vocabulario de estados, contrato público que reemplazará este adaptador y consistencia del ejemplo de dos stays.

Rutas canónicas del backlog: `/cuenta/reservas` y `/cuenta/reservas/[reservationId]`. `/cuenta/historial` conserva la misma vista por compatibilidad.

## Sesión, almacenamiento y caché

Las queries llevan prefijo `guest` y accountId. Cerrar sesión elimina esa caché. Los handlers validan la asociación entre account y profile. La seguridad es de demostración; no sustituye autorización Backend.

Los fixtures son memoria del navegador. Cada nuevo acceso inicializa su escenario; no se persisten datos personales ni tokens en storage. La edición se conserva al navegar durante esa sesión y se reinicia al iniciar otra. El formulario mantiene borrador, detecta cambios, bloquea doble guardado, conserva borrador ante error y permite cancelar/revertir.

## Escenarios manuales

Con `NEXT_PUBLIC_USE_MOCK_API=true`, reiniciar dev y entrar por `/acceso`:

- `demo@example.com`: caso completo, dos stays en la reserva actual, historial cancelado/no-show, ledger y ofertas con motivos.
- `empty@example.com`: acceso válido, sin reservas, documentos, beneficios, movimientos ni promociones.
- `data-error@example.com`: acceso válido, error al consultar datos.
- `data-offline@example.com`: acceso válido, fallo de red al consultar datos.
- `save-error@example.com`: consultas válidas, guardado de perfil rechazado; conservar borrador y permitir cancelar.
- `error@example.com` y `offline@example.com` siguen siendo errores de acceso de Public 02.

Pruebas: guardar Perfil y volver a Cuenta (mismo nombre actualizado); editar y cancelar (volver al valor guardado); cambiar correo de contacto (el correo de acceso permanece); visitar lista/detalle y ID desconocido; revisar beneficios/saldo/movimientos, ofertas elegibles/no elegibles/vencidas y no combinables; cerrar sesión y comprobar que las rutas de cuenta ocultan contenido.

Las facturas de demostración no tienen PDF emitido: se muestra `Descarga no disponible`. Solo se ofrece descargar si llega una ruta segura de documento. No se simula éxito con alert ni se genera un documento fiscal real.

## Evidencia de validación

- `npm run test -- --maxWorkers=2`: 17 archivos, 67 pruebas aprobadas, incluidas 15 nuevas de Public 05.
- `npm run lint`, `npm run typecheck` y `npm run build`: aprobados.
- Cobertura nueva: guardar/cancelar/reintentar Perfil, identidad de acceso separada, resumen sincronizado, alcance Guest, reserva con múltiples stays, detalle desconocido, Rewards sin cálculo, elegibilidad de promociones, estados vacíos/offline/error, limpieza de caché al salir y documentos sin descarga ficticia.
- Las pruebas de interacción se ejecutaron con Testing Library y MSW en jsdom. No sustituyen una revisión visual en navegador/Figma, que queda pendiente junto con las revisiones WEB-3 y WEB-4.

## Integración real BE-004-ACCOUNT-SUMMARY-01 (2026-10-06)

La integración de summary sustituye el endpoint provisional únicamente en modo
real. Browser GET /api/auth/guest/account/summary sin accountId/Bearer; BFF lee
la cookie Guest HttpOnly y llama GET /api/v1/guest-auth/account/summary. Backend
deriva la identidad de GuestPrincipal revalidado, nunca de query/body/UUID libre.
Service → AccountSummaryDTO confirmado → mapper → RealAccountSummary → hook →
dashboard. El contrato provisional, mapper y fixtures se nombran explícitamente
MockAccountSummary y siguen aislados por NEXT_PUBLIC_USE_MOCK_API=true.

Real: correo/active de GuestAccount, array de perfiles con FK explícita (puede
estar vacío o contener N), idioma nullable sin español implícito, count de
vínculos OTP propios y primera estancia RESERVED de reserva CONFIRMED vinculada
desde hoy según timezone de propiedad. Identidad de sesión no crea GuestProfile.
Una reserva del perfil o con igual email no se considera vinculada por sí sola.

Sin perfil muestra Sin perfil vinculado; múltiples perfiles se muestran sin
elegir principal. Sin estancia elegible muestra No tienes próximas estancias
confirmadas. Se representan valores ausentes sin inventar nombre, idiomas,
room count, Member/Gold, facturas o promociones. Los datos secundarios reales
no están integrados: tarjetas no interactivas Consulta aún no disponible.
Edición perfil y listado/vínculo Web quedan fuera; se evita ofrecer enlaces
desde el dashboard real a esas pantallas todavía provisionales. Mock conserva
las tarjetas/acciones previas.

401 de summary vuelve a comprobar la sesión Guest para que el gate refleje su
estado real; 503/red conserva sesión y muestra error/retry de summary. Mapper
whitelist y chequeo de scope defensivo; BFF filtra campos incluso anidados.
Ningún token o dato secundario extra se cachea como modelo de cuenta.
[Contrato/ownership/QA Backend](../../../backend/docs/42_GUEST_ACCOUNT_SUMMARY_CONTRACT_QA.md).

## Refinamiento visual de /cuenta (2026-10-06) — QA visual pendiente

Corrección exclusivamente de presentación autorizada por el usuario sobre el
working tree existente. Backend, contrato HTTP/DTOs, BFF, auth, cookies, Google,
refresh/logout, reglas de reservas y selección mock/real permanecen intactos.
BE-004-ACCOUNT-SUMMARY-01 y BE-005-AUTH-API-01 conservan EN_QA, no COMPLETADA.

- Se elimina el header interno de AccountDashboardPage tanto real como mock.
  PublicBookingShell conserva la única navegación principal, sin modificaciones.
- El correo se muestra una sola vez en la barra de sesión, secundaria y discreta.
  Cabecera Mi cuenta y Cuenta activa · N reservas vinculadas, sin repetir correo.
- Próxima estancia ocupa el ancho de la composición; Perfil y Reservas siguen
  debajo en dos columnas desktop y una en tablet/móvil. Estados vacíos originales
  preservados, sin inventar datos. Títulos Lora/display, información/acciones Inter.
- Facturas/Rewards/Promociones/Mensajes reales pendientes se agrupan en Más de
  tu cuenta: filas compactas Próximamente, sin enlaces ni botones funcionales.
- Superficies y bordes sutiles, radius-md, sin sombras ni translateY al hover;
  max-width 1120 alineado al sitio público. Solo tokens existentes, sin paleta
  nueva ni cambios a tokens.css. Acciones locales de 48px, focus visible,
  columnas minmax(0,1fr), wrapping y ausencia de animación nueva.

Validación: 73 tests Account/Auth UI relevantes PASS; suite Web completa
1056 PASS/214 archivos; typecheck/lint/build y git diff --check PASS. Tests UI
actualizados para header único, email único, tres cards protagonistas y lista
secundaria sin acciones; comportamiento mock y flujo de sesión previo preservados.

Revisión Firefox headless de componentes/CSS reales con fixtures efímeras en
/tmp, no con cuentas fabricadas en la BD: 1440px dos columnas; 768/375/320px
una columna, sin overflow horizontal, controles 48px, Inter/Lora cargadas.
Capturas desktop/mobile/tablet/mobile-narrow y métricas se conservan en
/tmp/guest-dashboard-visual-preview. El harness temporal se retiró del repo.
No sustituye el QA humano con la cuenta real del usuario.

Web integrada reconstruida únicamente con --no-deps; Backend y PostgreSQL no
reiniciados, .env preservado. Hashes verifican Backend completo, BFF, lógica
auth, DTOs, header público y tokens intactos frente al inicio de esta corrección.
Logs locales /tmp/guest-dashboard-visual-focused.log, visual-suite.log,
visual-typecheck.log, visual-lint.log, visual-build.log y
visual-integrated-build.log (todos con prefijo guest-dashboard-).

QA final: abrir /cuenta en el Web integrado con sesión Guest válida; revisar
header único, correo único, jerarquía/estados con datos reales, sección secundaria
compacta, desktop/tablet/móvil, foco de teclado y logout existente. Confirmar
PASS visual/manual antes de cerrar los incrementos. Sin commit/push/merge.
