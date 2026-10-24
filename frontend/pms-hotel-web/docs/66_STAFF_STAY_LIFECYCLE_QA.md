# Entradas y salidas Staff por estadía

Estado: EN_PROGRESO; implementación funcional validada, QA manual de José PASS
confirmado el 2026-10-22 y gate Web general pendiente. No COMPLETADA: el DoD global no se certifica con las
pruebas focalizadas.
Owner José. Autorización explícita para conectar Web al Backend54 el
2026-10-22. Rama `feature/staff-stay-lifecycle-web`, base9abea00, conserva el
incremento Backend anterior. José autoriza commit/push del incremento conjunto
tras su QA manual; no autoriza merge a main.

Extiende el detalle existente IMP-WEB-0302, fila consultada del XLSX sin editarlo.
Owner WEB-3/reviewer WEB-4 históricos; José implementa la ampliación autorizada.
Dependencia de lectura/asignación existente, contratos49/50/52/53 y
[contrato54](../../../backend/docs/54_STAFF_STAY_LIFECYCLE_CONTRACT.md) confirmado.
Backend54 tiene verify946 PASS y QA manual PASS confirmado por José;
el cierre integral sigue pendiente del gate Web general y checks de GitHub.
No se crea ID de backlog, estado operativo ni permiso nuevo.

## Alcance y aceptación

- Detalle `/reservas/{id}`, PROPERTY concreta, sesión Staff y
  RESERVATION_MANAGE. Entrada/salida independientes para cada ReservationStay;
  no habilitar cancelación/move/extension provisionales por quitar readOnly.
- Entrada solo sobre RESERVED con padre CONFIRMED y Room asignada. El Backend
  decide fechas locales, inspección, conflictos y bloqueos al confirmar.
- Salida sobre IN_HOUSE, incluso histórica sin Room; aviso explícito de salida
  anticipada sin recalcular fechas/cargos. Cualquier deuda o folio no verificable
  bloquea en Backend; frontend no deduce saldo0 de datos ausentes.
- Dialog accesible, confirmación, busy/doble clic, sin éxito optimista. BFF con
  cookie Staff, Origin, propiedad explícita, JSON estricto y allowlist del recibo
  y códigos409; no relaya detalles financieros ni credenciales.
- `updatedAt` viaja como texto exacto, sin redondear microsegundos. Un corte de
  conexión conserva clave y cuerpo originales mientras el componente/sesión
  siguen montados. Reintento explícito recupera el recibo, nunca genera una clave
  distinta para la operación incierta. No se persisten tokens en localStorage.
- Después del recibo se invalidan detalle/lista/stays, asignación, ocupación y
  limpieza de la propiedad. Recibo idempotente es histórico: consultar el estado
  actual, sin usar su status como reemplazo optimista del detalle.

## QA manual previsto

1. Con esta versión Backend/Web desplegada, ingresar como Recepción con
   RESERVATION_MANAGE. Crear reserva pública simulada para hoy y abrirla en Staff.
2. Sin asignación, entrada deshabilitada. Asignar Room INSPECTED, confirmar
   entrada y ver IN_HOUSE tras refrescar; otras stays intactas.
3. Confirmar salida; ver CHECKED_OUT y Room DIRTY/motivo en Habitaciones y HK.
   Fechas/cargos sin cambios. Esta salida no captura ni reembolsa dinero real.
4. Fixture autorizada con deuda y otra sin folio: mensaje específico, sin
   CHECKED_OUT ni limpieza alterada. Room DIRTY bloquea entrada.
5. Doble clic, red interrumpida, reintento, detalle cambiado en otra sesión,
   propiedad cambiada y logout. No duplicados ni efectos en otra sesión/property.
6. Escritorio/móvil, teclado/Escape y foco, sin overflow. Registrar casos que
   requieran fixtures como NO EJECUTABLE; no inventar QA manual PASS.

## Validación y entorno — 2026-10-22

- Lint/typecheck PASS, Node24 Linux, dependencias locales con package/lock
  comparados byte a byte. Build de producción PASS; rutas BFF nuevas incluidas.
- Reservas/BFF/UTC:50 archivos,340/341 PASS; las52 pruebas nuevas PASS. Único
  fallo: timeout5s del filtro/paginación de60 reservas en reservation-list.test.tsx.
  La misma prueba falla en HEAD9abea00 sin nuestros cambios,10/11 PASS del archivo.
- Dos suites generales se interrumpieron: la primera reveló dos fixtures del
  detalle sin QueryClientProvider, corregidas sin quitar assertions; ambas pruebas
  pasan en la validación focalizada. También hubo timeouts previos. La repetición
  encontró timeout5s en public-real-checkout.test.tsx; su primer caso reproduce
  exactamente el timeout en HEAD original. Diagnóstico filtrado, no suite completa
  aprobada. Sin @Disabled, exclusiones ni cambios de timeout/configuración.
- Backend946 PASS previo sigue vigente para las mismas fuentes Java;40 casos
  lifecycle y17 OpenAPI. No se atribuye una nueva ejecución Backend a Web.
- Chrome real en stack aislado:17 comprobaciones funcionales completadas,0
  respuestas5xx; búsqueda/detalle/checkout público simulado, reserva visible en
  Staff, asignación, rechazo sin inspección, inspección Admin, entrada Recepción
  con doble clic, checkout móvil390px y pérdida deliberada de respuesta después
  de procesarse. Reintento con clave/cuerpo idénticos recupera éxito; replay de
  entrada después de salir devuelve recibo histórico sin revertir CHECKED_OUT.
- SQL de solo lectura en QA confirma un CHARGE+130000 y un PAYMENT-130000, un
  evento STAFF de entrada y uno de salida; Room DIRTY con DND=true. ATS recupera
  exactamente la unidad. No cambios a fechas ni cargos por la salida anticipada.
- El QA global de navegador queda PARTIAL: un React418 de hidratación en Inicio
  con query de fechas. Reproducido por recorrido de solo lectura tanto en la
  versión anterior3001 como en la nueva3002; ninguna excepción nueva en Staff.
  El reporte original conserva FAIL; no se transforma en PASS ni se corrige
  Public01 dentro de este alcance.
- Docker3001 actualizado con Backend/Web de esta rama. Fue necesario recrear
  ambos contenedores porque build/up conservó inicialmente los anteriores.
  JAR activo SHA256 df6618a6969f20d511e7aa4bc82fef25f840297b353c888ca8faf97846e34794,
  idéntico al946 PASS. Tres servicios saludables; ruta nueva sin sesión401 y
  disponibilidad pública200 con6 ofertas. PostgreSQL/volumen/configuración del
  hotel preservados:2 properties/24 rooms/2 reservas/2 stays antes y después.
  Todas las reservas y limpiezas del QA se realizaron en PostgreSQL separado.
  Contenedores/redes temporales retirados al terminar; solo el stack habitual
  queda activo. El volumen aislado de QA queda detenido para conservar evidencia.
- Evidencia local fuera de Git: temporal pms-stay-lifecycle-web-qa, con logs,
  reportes iniciales/focalizados/baseline, screenshot móvil y SQL de QA. Backend
  target conserva la evidencia946 anterior. Sin commit/push/merge ni secretos,
  dependencias, migraciones o cambios de Compose versionados.

QA manual: José confirma que funciona y aprueba el incremento el 2026-10-22.
No se atribuye ejecución individual de todos los casos previstos a su confirmación.
Esta aprobación actualiza el pendiente manual de la evidencia histórica anterior.

Siguiente: publicar la rama autorizada y revisar los checks del PR. Para cerrar el
gate Web general queda validar la suite completa
en un entorno que permita diagnosticar los timeouts previos; no afirmar CI PASS.
Reservas históricas sin folio siguen bloqueadas por saldo no verificable según54.
