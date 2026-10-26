# Confirmación pública → Mis reservas — EN_QA

José solicita corregir el recorrido real Web el 2026-10-25. Fuente: main0d1f4b7,
J6, contrato C3 y AUTH-GUEST-REG-HISTORY-01. Implementación inicial en el worktree
fix/public-my-reservations-flow. El26/10 se traslada al proyecto principal en
fix/public-my-reservations-3001 para actualizar el entorno habitual; los cambios
locales de Android se conservan intactos.
No se actualiza XLSX ni se declara cerrado el historial IMP-WEB-0205.

## Diagnóstico confirmado

- GuestReservationsPage redirigía con account=null incluso durante checking/error.
- GuestAccessPage restauraba Staff aunque returnTo pidiera Mis reservas o checkout.
- El login contextual no pedía GUEST explícitamente y aceptaba una respuesta Staff.
- El contexto de navegación para Google descartaba /mis-reservas; un reintento
  sin returnTo también borraba el destino guardado.
- El historial conservaba /account/history?accountId provisional y la vista real
  estaba deshabilitada. Account Summary real no constituye un historial completo.
  Un vacío de la vista antigua no acredita que una reserva se haya borrado.

## Corrección de acceso implementada

- Esperar resultado Guest definitivo; errores recuperables permiten reintentar
  sesión y no se interpretan como sesión cerrada ni como historial vacío.
- Un destino Guest explícito o guardado no restaura Staff. Login pide context=GUEST
  y el mapper rechaza resultados/selecciones de otra esfera.
- El acceso universal sin intención Guest conserva restauración y login Staff.
  No se cierran sesiones Staff ni se modifican permisos o Backend Auth.
- Cerrar la sesión Guest vuelve al acceso contextual de cuenta para evitar que
  una cookie Staff coexistente cambie el recorrido del cliente al panel privado.
- Layout/Gate de cuenta conservan destinos Guest fijos validados. Las rutas
  externas, privadas Staff y parámetros de identidad no se aceptan como retorno.
- Google conserva únicamente el path Guest permitido (incluido detalle UUID) o
  los parámetros aprobados de búsqueda; nunca correo, referencia de confirmación,
  OTP, contraseña ni tokens en storage.

## Historial y vinculación reales implementados

José aprueba el contrato en backend/docs/GUEST_RESERVATIONS_READ_PROPOSAL.md el
2026-10-25. Listado paginado y detalle dependen de links persistidos y GuestPrincipal
activo, sin identidad seleccionada por el navegador. Proyección mínima: referencia,
hotel/zona horaria, responsable nullable, estado y todas las estancias con sus
fechas/tipo/estado. Sin precios, ocupantes, políticas ni notas internas inventadas.
El detalle se consulta por separado y no se busca solo en la primera página.

Transporte BFF Guest HttpOnly: /api/auth/guest/account/reservations y /{id}; OTP
/api/auth/guest/reservation-links/challenges y /verify. POST valida Origin/JSON,
claves cerradas y cuerpo acotado; no toma cookies Staff ni bearer del navegador.
202 solo aporta un desafío opaco,204 confirma vínculo sin devolver reservationId;
fallos inciertos nunca se convierten en éxito. Reenvío con espera local mínima60s
según C3, sin interpretar esa espera como expiración del OTP. Query/cache por
cuenta; cambio de sesión cancela e ignora verificaciones tardías. Sin persistir OTP.

Historial/detalle usan crema/serif/oliva y tarjetas responsivas. Carga, error y
vacío real se distinguen; el vacío explica que una reserva confirmada como invitado
puede requerir vinculación. Dashboard real ya ofrece historial y vínculo.

Se conserva la regla vigente: auto-link de historial compatible después de
verificar el registro/Google nuevo; OTP manual para vínculos pendientes. No se
vincula por correo no verificado ni se cambia silenciosamente el alta anónima J6.

## Evidencia

Regresiones antes del cambio:5 fallos de acceso Guest/Staff,2 de restauración,
1 de retorno guardado y1 de reintento Google. Backend verify completo1049 PASS
con Java21/PostgreSQL17; incluye alta pública anónima de dos estancias, ausencia
de acceso por email/perfil solamente, OTP incorrecto rechazado,204 real y consulta
posterior propia/listado/detalle, más404 para otra cuenta. OpenAPI y aislamiento
Guest/Staff validados. Web Node24: lint y typecheck PASS; build de producción
Next16.3.4 PASS con mocks=false. Typecheck ejecutado por separado; el build del
proyecto conserva su configuración previa de omitir validación TypeScript.

Focal de13 archivos:183/185 PASS; dos timeouts5s en recorridos mock anteriores de
reservation-link.test.tsx y reservation-link-page.test.tsx. Las12 pruebas nuevas
de interfaz real pasan, junto con las rutas BFF, mappers, acceso/contexto y sesión
Guest. El resultado focal no equivale a una suite general aprobada.
Repetición de los dos archivos después del build:12/12 PASS sin cambios; repetición
conjunta del26/10:183/185 otra vez, con los mismos timeouts. Se conservan los tests
originales y sus aserciones; el límite permanece en5s y ninguna prueba se deshabilita.

General local: interrumpida tras130/334 archivos con40 fallos reportados,
39 con duración de al menos5s y una aserción de Private09. El caso Private09
de cambiar propiedad y recargar pasó en repetición aislada sin modificar ese
módulo ni sus tests.
Tres casos Staff (cursor de segunda página y dos de edición inline) también
fallan por timeout en copia exacta de main0d1f4b7, sin esta corrección. Esos módulos,
shared/lib, workflow, dependencias y límites de pruebas permanecen intactos.
Evidencia: web-general-interrupted.json/log, main-staff-timeouts.log y
guest-final-verification.log fuera de Git. No afirmar CI general ni remoto PASS.
Otras evidencias: legacy-link-after-build.log, guest-final-verification-rerun.log
y private09-current.log. La validación focal sigue siendo parcial bajo carga.

Navegador Chrome con backend real/PostgreSQL aislados:16/16 comprobaciones PASS.
Alta pública anónima con dos tipos/estancias, cookie Staff vigente, acceso Guest,
vacío real antes del vínculo,202 opaco, OTP incorrecto rechazado,204 real, historial
y detalle con ambas estancias, móvil390px sin overflow, cierre Guest sin saltar
a Staff y conservación de su sesión. Sin excepciones JS ni respuestas5xx.
Revisión visual de capturas1440px y390px PASS.

La entrega de correo se sustituyó exclusivamente por un fixture controlado en
pms_guest_browser (instancia PostgreSQL QA): se preparó el desafío real para
verificar un código conocido sin contactar proveedores. La verificación HTTP,
sesión, vínculo persistido, reserva y lecturas sí son reales. Esto no acredita
entrega SMTP/Resend ni OAuth Google en vivo; el retorno Google tiene tests locales.

Sin commit/push, reservas de QA en la BD habitual, cambios a secretos, migraciones
o dependencias. Evidencia temporal fuera de Git: pms-public-reservations-qa y
pms-guest-history-qa. QA manual del owner pendiente; no declarar COMPLETADA.

## Entorno habitual actualizado el26/10

La versión que se sirve ahora está en http://localhost:3001. Se reconstruyeron
Backend y Web desde el proyecto principal con compose.yaml y se recrearon solo
esos dos servicios con --no-deps; ambos healthy. No se modificaron Dockerfiles,
Compose ni puertos. Se conservaron imágenes anteriores para recuperación.
PostgreSQL conserva el mismo contenedor y volumen persistente; antes/después:
2 propiedades,24 habitaciones,8 reservas,8 estancias y28 migraciones.

Navegador Chrome real en3001:18/18 comprobaciones PASS. Con cookie Staff activa,
/mis-reservas solicita acceso Guest, el formulario envía context=GUEST y devuelve
al historial público actualizado. Recargar y cerrar sesión Guest no abre Staff;
la sesión Staff sigue independiente. Lecturas propias200, detalle ajeno404,
escritorio y móvil390px sin overflow, cero excepciones JS y cero5xx.
No se crearon reservas/pagos, fixtures OTP ni cuentas en esta verificación.
La cuenta Guest demo tiene cero vínculos en esta BD; se muestra el vacío real
con la explicación y el acceso a vinculación. No atribuirle los datos del QA aislado.
Capturas de escritorio/móvil revisadas; resultado en live-browser-result.json y
deployment-result.json dentro de pms-public-reservations-3001, fuera de Git.

Limitación de configuración confirmada: clave HMAC OTP y credenciales de
Resend/SMTP vacías en el contenedor habitual. Se solicita autorización para una
clave local y la ruta de configuración del proveedor, sin pedir secretos en chat.
No se escribió .env ni se sustituyó la entrega real por un código de prueba.
La corrección de navegación está activa; la vinculación por correo queda
pendiente de esa configuración. No conectar cuentas solo por coincidencia de email.

## Recorrido de aceptación manual

1. Abrir http://localhost:3001 y recargar con Ctrl+F5 para renovar la versión
   abierta antes del despliegue. Crear reserva pública y conservar su referencia.
2. Pulsar Ver mis reservas. Incluso con Staff abierto en ese navegador debe
   continuar al acceso Guest y regresar al historial después del login.
3. Una vez configurados clave OTP y proveedor de correo, si aún no está vinculada,
   usar Vincular mi reserva con su referencia y la
   cuenta del mismo correo. Un código incorrecto no debe mostrar éxito.
4. Verificar el código correcto, abrir Mis reservas y comprobar referencia,
   fechas, tipos/estados y todas las estancias en listado y detalle.
5. Recargar, comprobar móvil y cerrar sesión Guest; no debe abrir Staff.
6. No interpretar un error de consulta como «no tienes reservas». Una reserva
   ajena/inexistente no debe revelar datos ni mostrar éxito de vinculación.

## QA aislado anterior — referencia histórica

El25/10 se validó en3002 con PostgreSQL aislado y sustitución exclusiva de entrega
de correo descrita arriba. El26/10 se detuvieron Web/API de ese preview para
evitar confusión y liberar recursos. Ese entorno no es el que debe probar el owner.
Sus referencias/vínculos pertenecen exclusivamente a su BD QA; no se copiaron a
la habitual. El puerto de prueba actual es3001, con servicios/datos habituales.

Estado EN_QA hasta aceptación manual y validación del gate aplicable. Sin commit,
push, merge ni cambios a los archivos Android ajenos del árbol principal.
