# Public 01 — Revisa y confirma tu reserva

## Alcance y fuentes

Incremento frontend solicitado por José para IMP-WEB-0110 (WEB-1 / revisión WEB-4): insertar revisión final entre los datos del huésped y la garantía. La fila del backlog y las dependencias IMP-WEB-0109/0106 se revisaron; la entrega corresponde al flujo de demostración existente. El contrato productivo, integración transaccional, ocupantes por Stay y revisión formal siguen pendientes. No se modifica el XLSX ni se declara completado el alcance Backend.

## Flujo y persistencia

1. `/reserva`: selección, Paso 1 de 4.
2. `/reserva/checkout`: datos del huésped, Paso 2 de 4. «Revisar mi reserva» valida el formulario y avanza.
3. `/reserva/checkout/revision`: revisión final, Paso 3 de 4. «Editar estadía» vuelve a selección; huésped y solicitudes vuelven al formulario, estas últimas con ancla al campo. «Continuar al pago» registra únicamente la revisión en memoria.
4. `/reserva/checkout/pago`: garantía, Paso 4 de 4. «Volver a revisión» conserva todos los datos; mantiene revalidación previa a la confirmación simulada.

Selección, moneda y datos personales se leen de los hooks y providers existentes. Query params contienen solo criterios de búsqueda; datos del huésped no entran en URL, logs ni almacenamiento del navegador. Recargar descarta el borrador. Modificar los datos invalida su aprobación y la revisión previa. Una selección o cotización diferente exige revisar de nuevo antes del pago; este guard frontend no sustituye autorización ni admisión Backend.

## Resumen y estados

Estadía, contacto, país traducido y solicitudes reflejan el borrador, sin valores personales precargados. Ausencia de solicitudes: «Sin solicitudes adicionales». El resumen admite varias habitaciones/cantidades y calcula alojamiento, servicio, impuestos y total con la cotización validada. USD/GTQ usa la conversión referencial existente. No inventa impuestos, descuentos ni política de hotel.

Cotización incompleta o con monedas mezcladas bloquea el paso al pago. Se reutilizan estados loading/error/offline/empty del checkout. No se crean reservas, cuentas ni pagos en la revisión. El banner describe la revalidación al confirmar en el paso siguiente; con mocks no existe reserva, cobro ni correo real.

Diseño crema, tarjetas blancas y panel lateral sticky en escritorio; apilado en móvil, cuatro pasos visibles, enlaces de edición con nombres accesibles, foco visible y animaciones que respetan reduced-motion. Ruta Next con lectura de searchParams asíncronos y API pública del módulo Checkout. Sin UI fetch, DTOs crudos ni nuevas dependencias.

## Prueba manual

Iniciar con mocks en puerto 3000. Buscar fechas futuras → seleccionar habitación → completar datos → «Revisar mi reserva». Comprobar resumen y totales, editar nombre/solicitudes y volver a revisar. Cambiar a quetzales y avanzar a pago; regresar a revisión. El botón del Paso 3 no cobra ni genera referencia. Solo el simulador del Paso 4 permite demostrar confirmación.

## Validación

- 42 pruebas relacionadas de selección, Checkout, gateway y simulador de confirmación: PASS. Se verifican lectura del borrador, edición bidireccional, búsqueda conservada, múltiples habitaciones, USD/GTQ, acceso directo, cotización incompleta y revisión obligatoria ante cambios de precio. La prueba larga de edición permite 10 segundos para varios cambios de pantalla y dos envíos del formulario; conserva todas las assertions. Los timeouts de carga observados bajo concurrencia se revalidaron sin Chrome ejecutándose simultáneamente.
- TypeScript, ESLint y build de producción con mocks: PASS. El chequeo de tipos es independiente del build.
- Chrome en puerto 3000: selección → datos → revisión → pago → confirmación; regreso a revisión y edición con datos conservados, rechazo/error recuperables, tarjeta aislada y doble clic sin duplicar: PASS. Sin llamadas Backend, PAN/CVV en transporte ni datos de checkout en browser storage.
- Revisión final, pago y confirmación sin overflow horizontal a 320, 390, 768, 1024 y 1440 px. Capturas de escritorio y móvil revisadas. Sin errores de consola en el recorrido final. Scripts y capturas en TEMP, fuera del commit.

Evidencia local: no acredita CI, revisión formal de equipo ni políticas o certificaciones productivas.
