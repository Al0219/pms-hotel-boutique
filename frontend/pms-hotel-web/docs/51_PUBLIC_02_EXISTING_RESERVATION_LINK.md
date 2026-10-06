# Public 02 — Vincular reserva existente

## Alcance y fuentes

Incremento frontend autorizado por José desde el botón de Cuenta vinculada, en `feature/web2-linked-account-confirmation`. Se reutiliza el recorrido documentado en la entrega 43 y el módulo account. No es una integración Backend.

Backlog consultado: `IMP-WEB-0205`, WEB-2 / reviewer WEB-3, PENDIENTE, ruta `/cuenta/reservas`, dependencias `IMP-WEB-0203, IMP-WEB-0111`; DoR API pública Reservation disponible; DoD RTL lista/vacío/error + boundaries. Este incremento de Public 02 enlaza ese historial existente y no declara cumplida la dependencia/API ni cierra 0205. `IMP-WEB-0202` sigue siendo el acceso Guest reutilizado. Fuente visual: solicitud explícita del usuario y paleta cream/olive existente, sin Node ID inventado. No se modifica el XLSX.

## Navegación y UX

- Cuenta vinculada → `/cuenta/reservas/vincular`, ruta estática dentro del layout Guest de cuenta; no se confunde con `[reservationId]`.
- Encabezado Serif, fondo crema, tarjeta blanca y guía lateral salvia con el correo de la cuenta destinataria. Volver a mi cuenta y Ver mis reservas conservan la sesión.
- Formulario reutilizable `ReservationLinkForm`, presentación standalone con progreso Referencia → Verificación → Vinculada. Validación/foco, submitting sin doble envío, error recuperable, expiración, reenvío y cambio de referencia reutilizan el flujo existente.
- Solicitar código no muestra datos ni añade la reserva. Solo verificar una respuesta válida permite mostrar éxito; el encabezado de éxito recibe foco. Ver mis reservas consulta el historial compartido; Vincular otra reserva reinicia el formulario.
- Visita anónima: guard Guest y acceso con retorno explícito a esta vista. La whitelist admite únicamente el path exacto, sin query arbitraria, fragmento, destinos externos o rutas Staff.
- El retorno tras Google puede conservar exclusivamente ese path fijo en el contexto no sensible existente. Se revalida/limpia y nunca se interpreta como una reserva en curso.

## Sesión y alcance de datos

El recorrido local por Google/correo requiere cuenta Guest activa, referencia, código y el mismo correo de la reserva. No se inventan identidades Google para cuentas por correo. Esta extensión corresponde al prototipo frontend de registro aprobado, no a un contrato real de email/password o vinculación Backend.

Se mantienen Service → DTO → Mapper → Domain → Hook → UI, los transportes MSW existentes y su guard que impide HTTP con mocks desactivados. No cambian los contratos Auth/Staff ni se accede a DTO desde UI. Los mappers verifican cuenta y desafío; el hook cancela al salir/cambiar sesión y actualiza exclusivamente caché Guest de reservas/resumen. Repetir el vínculo no duplica la reserva. Referencia desconocida/correo distinto reciben un rechazo genérico sin revelar datos.

DEC-B-004/006 siguen gobernando producción: Google validado + referencia + OTP real. Con mocks desactivados se presenta vinculación no disponible; no se ofrece un formulario que vaya a fallar contra una integración inexistente. Backend, BFF, credenciales, servicios, handlers, monedas, pagos, auditoría, inventario y estados de reserva no se modifican.

No se persiste referencia, OTP ni datos de la reserva en storage/URL. GuestAccount, GuestProfile, Reservation y ReservationStay siguen separados; vincular no crea una reserva ni altera stays/cargos.

## Prueba local

Servidor `http://localhost:3000/acceso` con mocks habilitados:

1. Crear cuenta con Google, o por correo usando el fixture `guest.google@example.com`, nombre/apellido y contraseña de formato válido. Correo es simulación frontend, no verifica una credencial real.
2. En Cuenta vinculada, pulsar Vincular reserva existente.
3. Referencia `HB-2026-10420` y Solicitar código de verificación.
4. Código local `12345678`; verificar. Ver mis reservas muestra una entrada con dos stays.
5. Repetir no duplica. `HB-2026-10421` añade otra reserva. Código incorrecto, referencia desconocida y cuenta con otro correo no vinculan.

Son fixtures independientes de la confirmación de checkout: un código generado en Public 01 no entra automáticamente en estos ejemplos. No hay correo real ni persistencia tras recargar. Instrucciones/códigos de prueba solo figuran en docs/fixtures, sin paneles de simulación en UI.

## Validación

Evidencia local del 2026-10-06:

- Vitest: 15 archivos / 124 pruebas aprobadas de Account, Auth, retorno y checkout. Incluye crear cuenta Google/correo, guard anónimo, verificación requerida, correo distinto, código incorrecto, expiración/reenvío, scope/desafío, idempotencia, caché, logout y separación Staff.
- `npm run lint`, `npm run build`, `npm run typecheck` y `git diff --check`: PASS. Tipos se comprueban por separado porque el build omite ese paso.
- Chrome local, puerto 3000: registro por correo → botón → referencia → OTP → éxito → Mis reservas, sin duplicados y con dos stays conservados. Acceso anónimo y retorno tras login; referencia desconocida sin exposición de datos: PASS. Sin errores de consola ni requests Backend/credenciales.
- Anchos 320, 390, 540, 768, 1024 y 1440 px: sin desbordamiento horizontal. Capturas de móvil/escritorio revisadas; scripts/capturas permanecen en TEMP, fuera del repositorio.
- Sin commit ni push. Revisión humana WEB-3, GitHub CI e integración Backend permanecen independientes.
