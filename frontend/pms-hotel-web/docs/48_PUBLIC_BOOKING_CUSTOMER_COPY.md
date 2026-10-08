# Public 01 — Textos finales para clientes

Corrección autorizada por José sobre las vistas existentes de Public 01 y su acceso/vinculación en «Mis reservas» (documentos 40–47). No cambia el backlog, los contratos, las políticas ni los servicios.

## Presentación

Se retiran banners de demostración y explicaciones sobre mocks, sesiones temporales o implementación pendiente del catálogo, detalle, selección, revisión, pago, confirmación, acceso e historial. Las acciones y errores usan lenguaje para clientes. El comprobante impreso y el calendario también muestran textos de reserva, sin etiquetas de demostración. No se promete que un correo ya fue enviado.

Los controles de aprobación/rechazo del gateway quedan ocultos por defecto. `showTestControls` solo se habilita explícitamente en los harnesses automatizados; ninguna ruta pública lo activa. Se preservan las pruebas de rechazo, recuperación e idempotencia. Al cancelar la edición de tarjeta, se restaura la tarjeta anterior en lugar de sustituirla por Visa.

El formulario conserva el iframe aislado, CSP sin red, validación de tarjetas sintéticas y transmisión exclusiva de metadata tokenizada. Sus textos son neutrales; no se amplía la aceptación a tarjetas reales. El código OTP fijo y las referencias de ejemplo ya no aparecen en la interfaz: para QA siguen disponibles en el documento 43 y las fixtures.

Se conservan información sobre conversión referencial, moneda cotizada, límites del abono, cancelación según la tarifa, verificación de disponibilidad y errores de resultado incierto. No se inventan certificaciones PCI/SSL, términos legales, promociones, políticas de pago en recepción ni URLs de redes sociales.

## Límites técnicos que siguen vigentes

Esta entrega prepara la presentación, no conecta Backend ni PSP. Los guards con mocks desactivados permanecen y muestran indisponibilidad en lenguaje para clientes. Confirmaciones, vínculos y borradores siguen en memoria. Contactos, imágenes y tasa de cambio siguen siendo datos de referencia configurables; no se habilitan llamadas ni se publican perfiles ficticios. La reserva del checkout no se añade automáticamente al historial independiente de Account.

Antes de publicar para clientes reales se requieren Backend/PSP, autenticación/OTP/correo reales, persistencia y contenido aprobado del hotel. Los documentos 43–47 conservan la descripción técnica de sus entregas; esta corrección sustituye únicamente sus textos visibles y la exposición pública de controles de simulación.

## Validación local

- Regresión Booking/Checkout, gateway, acceso y vinculación: 21 archivos / 159 pruebas distintas. La ejecución inicial encontró dos expectativas de avisos retirados; tras adaptarlas sin eliminar controles de datos/importes/envío, la reejecución de ambos archivos pasó sus 19 pruebas. Las restantes pruebas pasaron en la ejecución inicial.
- `npm run lint`, `npm run typecheck` y `NEXT_PUBLIC_USE_MOCK_API=true npm run build`: PASS. No se modifican las validaciones del build.
- Chrome en el puerto 3000: checkout completo, Q/USD y monto personalizado convertible, edición de datos, formulario aislado con validación/foco, doble clic sin duplicar envío, confirmación, copiar referencia, PDF/calendario, limpieza del borrador y acceso directo sin resultado: PASS. También acceso Google y vinculación por código; la UI no muestra OTP ni instrucciones de QA.
- Revisadas capturas de pago en escritorio y confirmación móvil. Sin overflow a 320, 390, 768, 1024 y 1440 px; sin errores de consola/ejecución, solicitudes Backend ni PAN/CVV en payloads/almacenamiento. El selector de escenarios no aparece en la ruta pública. Helpers y artefactos permanecen en TEMP.

Esta evidencia es local y no equivale a CI remoto, certificación de pagos ni integración Backend.
