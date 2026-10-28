# Consulta de una reserva sin cuenta: correo + código

Estado: CONTRATO CONFIRMADO / QA MANUAL PASS / CI PENDIENTE, actualizado 2026-10-28.
José sustituye explícitamente la consulta por OTP/correo por la primera opción:
correo utilizado al reservar + código de confirmación → únicamente esa reserva.
Owner José; integración con Guest/Reservations existentes, sin cambios Android.

## Alcance y autorización

Consultar una reserva no requiere cuenta. Ambas credenciales deben coincidir
en la misma Reservation persistida y su GuestProfile responsable. Normalización:
correo trim/lowercase, referencia trim/uppercase. Las referencias actuales son
aleatorias; no se admiten búsquedas parciales. Incluye todos sus ReservationStay
y estados históricos, también cancelados, sin listar otras reservas del correo.

Para ver todas las reservas/historial se requiere GuestAccount autenticada y
sus vínculos mediante correo verificado existentes (C3/56/57). Tener una cuenta
no concede automáticamente reservas ajenas. Este incremento no crea cuentas,
links, GuestIdentity, sesión Guest/Staff ni otorga permisos de modificación.

Se reduce la prueba de pertenencia al conocimiento conjunto de correo/código,
no a la posesión verificada del buzón. Por ello es una proyección limitada de
lectura: referencia, hotel, estado, fechas, tipo y habitación si está asignada.
Ampliación aprobada2026-10-28: fecha de creación, canal, moneda, código del tipo
y timezone por estancia, e importe original de confirmación cuando exista un
comprobante público persistido coherente. No es un saldo actual ni consulta de
movimientos. No devuelve huésped/contacto, documentos, notas Staff, folio o pagos. El código
debe conservarse privado. Backend aplica correo/código/coherencia de propiedad
en SQL antes de leer; una Reservation puede incluir N stays.

## API y BFF

Única operación Backend: POST /api/v1/public/reservation-lookup/search.
Única operación BFF Web: POST /api/public/reservation-lookup/search.
JSON cerrado: {email, confirmationCode}, máximo 2 KiB incluso streaming.
email válido, máximo 320 caracteres; código de 6–40 letras ASCII/dígitos/guiones,
primer carácter alfanumérico. Se aceptan mayúsculas/minúsculas, sin query params.
El correo se contrasta con el contacto responsable de la reserva.

200: {stays: GuestLinkedStay[], details: GuestStay[], overview, accommodations}
de UNA reserva. overview={createdAt,source,currency,confirmedTotalMinor}; source
y total pueden ser null. accommodations=[{stayId,roomTypeCode,timezone}], uno por
estancia. Total leído del receipt COMPLETED con misma reserva/referencia/moneda;
si falta, no coincide o hay importes conflictivos se devuelve null, nunca tarifa
actual ni cero inventado. No se devuelve el snapshot, referencia de pago o ledger.
400: formato/campos/JSON inválidos.
404: combinación inexistente, idéntica respuesta si falla correo, referencia o ambos.
429: cuota agotada; no indica si hay una reserva.
503: infraestructura temporalmente no disponible.
Todas las respuestas private, no-store. BFF valida Origin exacto configurado y
no reenvía cookies/JWT Guest/Staff, ni inputs adicionales. Allowlist de salida
y mapper verifican una reserva y coherencia entre resumen/detalles N-stay.

No hay endpoints de OTP, verificación, listado por correo, detalle sin ambos
datos ni grant de consulta. Tampoco tokens nuevos en JS/cookies/URL/storage.
Las cookies antiguas de consulta se retiran al realizar una búsqueda exitosa;
Guest/Staff permanecen intactas. Un grant anterior no autoriza ninguna lectura.

## Protección, auditoría y persistencia

Hasta 5 búsquedas fallidas por 30 minutos y 10 búsquedas totales por hora,
independientemente por correo y por referencia. Cambiar el otro dato no evita
la cuota. Locks advisory PostgreSQL en orden estable serializan las cuotas.
Los intentos fallidos se confirman antes de emitir 404; los bloqueados no
generan efectos de negocio. Respuestas genéricas, sin enumerar correos/códigos.

Nueva migración aditiva 003-015: public_reservation_queries con fingerprints
SHA-256 separados por propósito, resultado FOUND/MISS y timestamp UTC. No guarda
correo, referencia, OTP o tokens en claro. Auditoría append-only protegida por
trigger; no se modifica ni utiliza el historial financiero. La 003-014 ya aplicada
permanece INTACTA; sus tablas OTP/grants quedan sin rutas ni código que les otorgue
acceso. No se borran filas, tablas ni migraciones aplicadas.

UI conserva resultados solo en memoria: cerrar, recargar o salir elimina la
consulta; limpieza adicional a los 15 minutos, también al recuperar foco.
Galería/descripcion editorial Web reutiliza el catálogo público por código exacto,
con aviso de fotografías de referencia; código desconocido no inventa fotos. No
se consulta disponibilidad para visualizar una estancia pasada o agotada. N stays
se muestran completos, sin colapsar a la primera habitación. Imprimir/copiar código
y conversión indicativa no alteran reserva, precio original ni datos financieros.
El Backend público actual no persiste adultos/niños, teléfono, solicitudes ni
selección de extras de búsqueda; esta lectura no los fabrica ni cambia el alta.
No requiere EmailSender, proveedor de correo o clave HMAC. No se cambian secretos
ni configuración de los flujos de registro/vinculación Guest existentes.

## Aceptación

Correo correcto + código correcto devuelve solo esa reserva, también N stays.
Correo/código incorrectos dan el mismo404; no se admite código solo/correo solo,
accountId/propertyId/IDs ajenos ni JWT como sustituto. Probar cuotas compartidas,
concurrencia, auditoría inmutable, datos financieros intactos, migración de
upgrade desde014/idempotencia, OpenAPI, capas UI y separación Guest/Staff.
Sin dependencias externas ni permisos/roles nuevos.

QA manual PASS confirmado por José2026-10-28; commit/push autorizados.
Gates generales/CI pendientes, sin autorización de merge. Evidencia actual y
límites del gate Web en [Web73](../../frontend/pms-hotel-web/docs/73_PUBLIC_RESERVATION_LOOKUP_QA.md).
Las pruebas anteriores del flujo OTP son históricas y no validan esta versión.
Sin commit/push sin autorización.
