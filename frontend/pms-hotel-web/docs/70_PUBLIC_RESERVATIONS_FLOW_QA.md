# Confirmación pública → Mis reservas — integración EN_QA

## Alcance y contrato vigente

José autoriza el26/10 integrar origin/main a98250f en
fix/public-my-reservations-3001 y publicar tras resolver/validar. Main incorpora
PR166 (activación Staff) y167 (Backend Guest/Android). Las dos ramas agregaban
GET /api/v1/guest-auth/account/reservations con respuestas distintas.

Se conserva el contrato compartido56/57 de main: lista plana de estancias
vinculadas, GET /{reservationId}/stays/{stayId} y POST /reconcile. Web reutiliza
su BFF, service, mapper y hooks; agrupa N estancias por reserva, consulta el
detalle de cada estancia y conserva refresh Guest/refetch al recuperar foco.
No se agrega un segundo mapping ni se altera la API usada por Android.
La paginación y el detalle por contenedor de la versión inicial de esta rama
se retiran junto con su implementación duplicada; contrato original marcado
sustituido en backend/docs/GUEST_RESERVATIONS_READ_PROPOSAL.md.

La reconciliación solo usa sesión Guest y evidencia de correo verificado
persistida; no toma identidad del navegador, no transfiere vínculos ni recrea
reservas, estancias, pagos o recibos. Se conserva su separación transaccional y
sus pruebas de main. La ruta GET no realiza recuperación ni escrituras.
Migraciones nuevas de main se conservan sin editar las aplicadas.

## Presentación y acceso conservados

- Fondo crema, encabezados serif, tarjetas blancas/oliva y layout adaptable.
  Referencias y todas las estancias, fechas/noches, estado de reserva separado
  del estado de estancia y habitación asignada o por asignar. Tipo persistido
  en el detalle. No inventar precios, titular, ocupantes, políticas o zona horaria
  ausentes de la proyección vigente.
- Carga, error, vacío real y detalle no disponible se distinguen. Un fallo no
  se convierte en ausencia de reservas ni en cancelación. Reintento explícito.
- /mis-reservas espera restauración Guest definitiva; error de sesión permite
  reintentar. returnTo Guest explícito o guardado evita restaurar Staff.
- Login contextual solicita GUEST y rechaza respuestas de otra esfera. Acceso
  universal Staff sigue operativo. Retorno Google usa rutas Guest validadas.
- Se conserva afterStaffActivation de main: esa pantalla no retoma sesiones
  Guest/Staff anteriores ni un registro pendiente. Regresiones específicas.
- Logout Guest conserva retorno público; la sesión Staff sigue independiente.
  Layout/Gate mantienen el destino aprobado y rechazan rutas externas/Staff.

## Vínculo manual C3

Los BFF /api/auth/guest/reservation-links/challenges y /verify continúan el
contrato existente C3: cookie Guest HttpOnly, Origin/JSON/cuerpo acotado y claves
cerradas.202 devuelve solo requestId opaco;204 vacío confirma el vínculo.
No se inventan TTL, reservationId de respuesta, OTP o éxito tras fallo incierto.
El reenvío respeta60s y no equivale a expiración del desafío. Cambio de sesión
cancela e ignora resultados tardíos. Sin persistir OTP ni datos sensibles.

Tras204 se invalidan únicamente las claves propias de main:
['guest','reservations','real',accountId],
['guest','reservation-stay','real',accountId] y account-summary.
Las claves mock y Staff permanecen separadas. Mock explícito sigue funcionando.

La vinculación automática compatible aprobada en main depende del correo
verificado en Backend. La vinculación manual OTP sigue requiriendo clave HMAC y
entrega Resend/SMTP configuradas; no se generaron secretos ni se simuló correo
en los servicios habituales como parte de esta integración.

## Validación de integración

- ESLint PASS y TypeScript PASS; correcciones de tipos de los tests adaptados.
- Backend ./mvnw -B verify completo con Java21/PostgreSQL17 aislados: BUILD
  SUCCESS,1077 pruebas, cero fallos/errores/omitidas. Incluye23 OpenAPI,14
  invitaciones Staff,9 MVP Android,6 recuperación y7 regresiones C3/historial.
- Web focal Windows,15 archivos:206/217 PASS. Nueve timeouts5s y dos esperas de
  datos que aún mostraban carga; no se atribuyen todos a un fallo funcional ni
  se declara gate aprobado. Las seis pruebas OTP nuevas pasan. Suite completa
  Linux/Node24 programada tras Maven, un worker para evitar competencia local.
  Sin excluir tests, elevar timeouts ni cambiar workflow/deps.
- Lint/typecheck/build Linux PASS. Primera general Linux:2472/2535,337 archivos;
  el contenedor heredó NEXT_PUBLIC_API_BASE_URL=/api, variable de despliegue que
  causa Invalid URL en varios tests. No modificar HTTP/services para ocultarlo.
  Repetición del primer archivo sin variables de despliegue:3/3 PASS sin cambiar
  código. Evidencia original conservada; no atribuir PASS remoto.
- General limpia completa, Node24 y dos workers:2521/2535,337 archivos. Trece
  timeouts5s y una aserción de carrito en el caso de replay cancelado. Ese test
  usa una respuesta simulada de100ms; la repetición posterior pasa sin modificar
  implementación ni aserciones. No atribuir todos los fallos iniciales a timeouts.
- Repetición de los9 archivos fallidos, un worker y mismo entorno limpio:
  243/246. Checkout25/25, vínculo4/4, inline Staff69/69, estado Staff48/48,
  habitaciones12/12 y limpieza2/2 PASS. Persisten timeouts en cursor Staff,
  rechazo de red en revalidación de búsqueda y filtros/paginación de reservas.
  Estos archivos de tests y sus componentes no tienen modificaciones propias
  frente a main; no afirmar que se reprodujeron en una ejecución de main actual.
  No se amplían límites, eliminan aserciones ni modifican módulos ajenos.
  Gate general Web no aprobado; EN_QA y checks remotos pendientes.

Se mantienen las pruebas entrantes de main y se adapta la cobertura anterior
al contrato compartido: N estancias y datos privados, aislamiento por vínculo,
identidad ajena, sesión revocada/Staff, hotel inactivo, error/reintento y recorrido
HTTP anónimo→dos estancias→OTP incorrecto→OTP válido→lectura propia/404 ajeno.
Las aserciones de páginas y del DTO retirado no describen el contrato vigente;
se sustituyen por verificaciones de lista y detalle de estancia reales.

Evidencia de integración fuera de Git: pms-guest-main-integration-20261026;
backend-verify.log/reports, web-general-clean.json, web-retry.json y logs de
lint/typecheck/build. La corrida con variables de despliegue permanece separada.
No modificar el XLSX ni declarar cerrado IMP-WEB-0205 global.

## Entorno habitual y evidencia previa

El26/10, antes de esta integración, se desplegó300a4f7 en el puerto3001:
Backend/Web healthy,18/18 comprobaciones del navegador PASS con Staff coexistente,
Guest real, historial, recarga, móvil390px y logout; cero escrituras de reservas
para esa verificación. PostgreSQL conservó contenedor/volumen/conteos:
2 propiedades,24 habitaciones,8 reservas,8 estancias y28 migraciones.
Esta evidencia corresponde a esa versión previa, no a un despliegue del merge.

La integración se valida sin recrear esos servicios ni tocar su base de datos.
Las imágenes de3001 no se actualizan automáticamente por git commit/push.
El preview anterior3002 está detenido; no es el entorno de aceptación del owner.

Evidencia histórica anterior al merge: Backend1049 PASS, build/lint/typecheck
PASS y QA aislado16/16 (la entrega de correo se sustituyó solo en esa BD QA,
no en producción). Focal Web183/185 con dos timeouts5s mock; ambos archivos12/12
al repetir separados. General interrumpida tras130/334 archivos con40 fallos,
mayormente timeouts; tres Staff también reproducidos en main0d1f4b7. Esos
resultados no acreditan la integración actual ni CI general verde.

## QA manual de aceptación tras desplegar la integración

1. En http://localhost:3001 recargar con Ctrl+F5, crear una reserva como invitado
   y conservar su referencia; el pago sigue siendo simulado según el proyecto.
2. Con Staff abierto en el mismo navegador, pulsar Ver mis reservas: debe abrir
   acceso Guest y regresar al historial público actualizado, sin ir al dashboard.
3. Acceder con la cuenta cuyo correo está verificado. La reconciliación debe
   recuperar reservas confirmadas compatibles sin repetir creación ni pago.
4. Comprobar referencia, todas las estancias, fechas, estados y detalle del tipo/
   habitación. Recargar y volver al foco deben conservar/actualizar la información.
5. Si hace falta vínculo manual y el proveedor está configurado, solicitar C3,
   rechazar OTP incorrecto y verificar uno correcto sin duplicar reservas/vínculos.
6. Una consulta fallida debe permitir reintentar; una estancia ajena/inexistente
   no debe revelar datos. Comprobar móvil y cerrar Guest sin saltar a Staff.
7. Verificar acceso universal Staff y login tras activar una cuenta Staff.

Estado EN_QA hasta QA manual aplicable del owner y gate correspondiente.
Android local permanece fuera de los cambios propios; se conservan los ajustes
EAS/paquete y se incorpora expo-secure-store proveniente de main.
