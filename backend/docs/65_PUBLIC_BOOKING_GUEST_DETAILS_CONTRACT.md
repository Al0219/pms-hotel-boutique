# Datos del huésped del checkout público

Corrección autorizada por José el 2026-10-29 tras QA manual: una reserva nueva
perdía teléfono, país, documento y solicitudes especiales antes de persistir.
Estado COMPLETADA; validación técnica y QA manual del owner PASS.
Mismo incremento `feature/staff-reservation-detail`.
Extiende J6 y contrato64 sin nuevos endpoints, permisos ni método de pago.

## Entrada y persistencia

`POST /api/v1/public/bookings` sigue siendo anónimo y requiere Idempotency-Key.
Conserva los campos obligatorios y rechaza campos desconocidos/PAN/CVV.
Añade opcionales nullable para compatibilidad con clientes anteriores:

- `bookingGuest.phone`: teléfono internacional, prefijo + y entre 8 y 18 dígitos
  conforme al formulario público existente; no es una verificación de titularidad.
- `bookingGuest.country`: país/región de residencia ISO alpha-2 en mayúsculas;
  solo códigos ISO reconocidos. No se infiere nacionalidad.
- `bookingGuest.documentNumber`: 4–25 letras/dígitos/guiones. No se infiere tipo.
- `notes`: solicitudes especiales de la reserva, texto no vacío de hasta 250
  caracteres, sin NUL; omitir si el formulario está vacío.

Teléfono/documento se guardan en GuestProfile; país en su columna nullable nueva
mediante changeset `004-011-guest-profile-country`. Ninguna migración aplicada
se modifica. La lectura del perfil personal usa columnas explícitas para evitar
confundir su país de preferencias con la nueva columna del perfil de reserva;
conserva su contrato y las comprobaciones de versión/reintento existentes.
Notas se guardan en Reservation.notes. No se crean cuentas ni
ocupantes implícitos, ni se usan preferencias de GuestAccount como datos históricos.
Captura de datos no equivale a acreditar identidad; Staff contrasta el documento
físico al check-in. El detalle Staff conserva la máscara y añade `contact.country`.

Alta atómica existente: pago simulado, perfil, reserva, stays, folio y recibo.
Un fallo no guarda una reserva parcial. La respuesta pública y su snapshot no
incluyen los nuevos datos personales. GET Staff mantiene permisos y scope antes
de consultar; el listado no añade contacto ni notas. No hay nuevas escrituras
en las operaciones de lectura ni modificaciones financieras retrospectivas.

Un perfil histórico nunca se sobrescribe por una petición pública. Si se envían
nuevos campos de contacto solo se reutiliza un perfil anónimo activo único con
nombre/correo y todos esos campos idénticos; de otro modo se crea otro perfil.
Peticiones antiguas conservan sus reglas de reutilización sin modificar perfiles.

## Idempotencia y privacidad

Payload anterior (campos nuevos ausentes/null): huella V1 idéntica byte a byte,
compatible con recibos persistidos. Payload ampliado: V2, mismos campos ordenados
y longitud UTF-8, más teléfono/país/documento/notas, con null codificado como -1.
Cambiar cualquiera con la misma clave devuelve409, sin nuevos cobros ni reservas.
Misma clave/cuerpo devuelve201 con snapshot original sin releer datos de perfil.

Web envía mediante allowlist. El formulario y cuerpo pendiente solo viven en
memoria React: no URL, logs ni almacenamiento del navegador; se limpian al
confirmar. Los registros antiguos sin estos datos siguen mostrando No registrado;
no se recuperan valores que nunca llegaron al servidor.

## Validación requerida

Regresión HTTP real: alta anónima → PostgreSQL → detalle Staff autorizado con
teléfono/país/documento enmascarado/notas. Replay sin duplicados, cambios409,
validación400 sin escrituras y perfil anterior intacto. Migración upgrade conserva
datos/checksums y segunda aplicación idempotente. OpenAPI refleja los opcionales.
Web: formulario real → payload completo, allowlist, reintentos/limpieza de datos,
mapper/BFF/UI y compatibilidad con contacto anterior. QA en Compose3001: crear
una reserva desde el formulario y leer los datos después de recargar como Staff.

## Evidencia final — 2026-10-29

`./mvnw -B verify`, Java21/PostgreSQL17 aislado: BUILD SUCCESS,1241 pruebas,
0 failures/errors/skipped. Incluye70 HTTP público,6 OpenAPI público y11 de
perfil personal. La primera corrida detectó la colisión SELECT p.*,m.country;
se corrigió la selección de columnas y la segunda suite completa pasó sin
modificar ni deshabilitar las aserciones originales del perfil personal.

Web:114 pruebas relevantes en11 archivos PASS; ESLint y TypeScript PASS.
Builds Docker de ambos servicios PASS. Chrome real en3001:35 comprobaciones
PASS, checkout público real → persistencia → Recepción/Super Admin, contacto,
país diferente del predeterminado, máscara, notas, móvil y logout401; sin
excepciones JavaScript/API5xx. Una única reserva ficticia creada: NNU6E7QMZH.

PostgreSQL conservado:17→18 reservas,17→18 stays,18→19 perfiles,32→34 movimientos
simulados y36→37 migraciones. Huellas de todos los registros anteriores y
checksums de migraciones anteriores idénticos; país nullable es aditivo.
Backend/web saludables en el Compose habitual3001. Evidencia y capturas fuera
de Git: %TEMP%/pms-public-booking-details-qa. Sin commit/push/merge.
José confirmó el QA manual PASS y autorizó commit/push de este incremento.
Siguiente: revisión/checks del PR.
