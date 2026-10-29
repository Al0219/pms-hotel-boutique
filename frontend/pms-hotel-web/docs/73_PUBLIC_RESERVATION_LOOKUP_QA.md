## Aceptación manual y publicación autorizada — 2026-10-28

José confirma QA manual PASS del resumen completo y autoriza commit/push de
fix/guest-reservations-visibility. Aceptación visual/funcional aprobada; los
resultados automatizados y límites del gate Web se conservan abajo. CI del PR
pendiente; no se presume validación global verde ni se autoriza merge. Última
limpieza: historial de cuenta restaurado a HEAD, sin modificar su comportamiento.
Fetch remoto fa56e3e: solo cierre documental Staff176, sin integración de main.

## Ampliación visual2026-10-28 — EN_QA

El usuario aprobó la consulta correo+código y solicita un resumen que permita
reconocer la reserva. Galería reutilizada de Public01 y metadata editorial por
código persistido, sin consultar ATS actual. Una tarjeta completa por stay,
fechas/duración/asignación/estado, hotel, canal, creación y correo ingresado.
Solo importe original de receipt coherente, opcional; sin precio actual inventado,
saldo o movimientos financieros. Conversión visual GTQ/USD, copia y PDF del navegador.

Datos no guardados por el alta pública vigente (adultos/niños, teléfono, extras o
solicitudes) no se fabrican ni se recuperan de almacenamiento local. Las fotos
son de referencia del catálogo actual, no un snapshot histórico de la reserva.
Código sin galería conserva un fallback honesto. Guest/Staff/historial intactos.

Backend focal34 PASS:9 de consulta y25 OpenAPI, sin errores/omitidos; paridad
93ops/75paths/124schemas/16tags. Sin migraciones, configuración o dependencias
nuevas; lectura no altera receipts/finanzas. Web lint/typecheck PASS; focal
81/82 PASS, solo timeout5000ms de vinculación anterior. Recheck aislado8/8 PASS,
sin cambio de código/test/timeout para ocultarlo. Nuevas9 UI +5 mapper +6 BFF
y galería/editorial compartidos PASS. Build Docker backend/web PASS; tres
servicios healthy en3001. Chrome real29/29 PASS: consulta única sin ATS, galería
con fotografías reales/flechas/miniaturas, total original y cambio de moneda,
acción de imprimir, fechas/canal, móvil390 sin overflow, privacidad y cuentas/
Staff intactos. Sin excepciones ni API500, reservas o pagos nuevos.
Baseline nueva:16 reservas/16 stays/1 cuenta/1 vínculo/30 movimientos y su digest
financiero idénticos tras despliegue/QA; migraciones35, sin cambios. Artefactos:
gallery-backend.log/status/reports, gallery-web.json, gallery-link-recheck.json,
gallery-browser-result.json, gallery-desktop.png y gallery-runtime-*.json fuera
de Git. Un primer harness buscó las flechas por texto en lugar de aria-label;
se corrigió únicamente el selector del harness y el run final pasó29/29. Los resultados de abajo son
históricos de la consulta mínima. QA manual de ampliación pendiente; sin commit/push.

QA nuevo: comprobar cada habitación/miniatura/flechas/teclado; estados/fechas
sin depender de disponibilidad actual; monto original y conversión de referencia;
copy/PDF; móviles390 y760; desconocidos sin fotos/importes sin inventar; origen
malicioso y parejas ajenas siguen denegados; cuentas/restauración/Staff separados.

# QA — Consulta de una reserva invitada

Versión 2026-10-28, rama fix/guest-reservations-visibility, EN_QA.
Contrato [Backend62](../../../backend/docs/62_PUBLIC_RESERVATION_LOOKUP_CONTRACT.md).
Decisión explícita del usuario: sustituir OTP/historial anónimo por correo + código.
No se requiere configurar correo ni HMAC para esta consulta.

## Flujo esperado en el puerto habitual 3001

1. Abrir http://localhost:3001/mis-reservas sin sesión Guest.
2. Introducir correo de contacto y código exacto del comprobante.
3. Ver UNA reserva y sus estancias. Abrir cada estancia para tipo/fechas/estado.
4. Una segunda reserva del mismo correo no debe aparecer sin su propio código.
5. Probar correo/código incorrectos: mismo mensaje, sin revelar cuál falló.
6. Consultar otra reserva limpia resultados y campos. Recargar también limpia.
7. Historial completo: Crear cuenta o iniciar sesión → flujo Guest existente.
8. Verificar que una cookie Staff no redirige al panel ni sustituye la consulta.
9. Probar móvil390px y teclado; errores asociados a campos y primer error enfocado.
10. Cinco fallos/30min o diez consultas/hora por correo O referencia bloquean nuevas
    consultas; usar datos descartables y esperar, no borrar auditoría para reintentar.

Datos mostrados solo en memoria, sin localStorage/sessionStorage. Cierre adicional
a los15min. Ninguna alta/reserva/pago repetido durante el QA sobre datos existentes.
No mostrar correo real/código privado en evidencias compartidas.

## Automatización

Backend: pruebas focalizadas de consulta, OpenAPI y migraciones/upgrade.
Web: componente, BFF, mapper y acceso Guest, además de lint/typecheck/build.
Navegador real y despliegue en3001 deben corresponder a la nueva versión.
Backend: ./mvnw -B -Dtest=PublicReservationLookupIntegrationTests,OpenApiContractIntegrationTests,UnifiedLoginMigrationIntegrationTests,AmenitiesMigrationIntegrationTests,GuestRegistrationMigrationIntegrationTests,PublicBookingReceiptSchemaUpgradeTests,StaffAuthAuditAppendOnlyIntegrationTests,StaffAuthAuditAttributionIntegrationTests verify: BUILD SUCCESS,56 PASS,0 fallos/errores/omitidos.
Incluye7 de consulta y25 de OpenAPI; paridad93/75/122/16 y migraciones35.
Lint y typecheck PASS. Web focal final:55/55 PASS en8 archivos Node24/Linux,
maxWorkers1 y timeouts originales. Incluye consulta, BFF, mapper, acceso/historial/
vinculación Guest, navegación/FAQ y ticket. Ejecuciones previas con compilación
concurrente registraron timeouts; no se cambió código ajeno ni sus límites para
corregirlos. Ajustada la expectativa de FAQ al nuevo flujo explícito; todas sus
assertions siguen activas. Un recheck Windows del historial agotó findBy; Linux
final13/13 PASS. Logs de intentos conservados fuera de Git.
Build Docker backend/web PASS. Imágenes actualizadas mediante Compose raíz,
sin recrear PostgreSQL; tres servicios healthy, puerto3001. Chrome real21/21
PASS sobre una reserva persistida: correo+código, detalles, error404 idéntico,
solo correo/campos extra400, origen externo403 y listado antiguo404. Staff
coexistente no redirige; historial/detalle/login/logout Guest siguen operativos.
Móvil390 sin desbordamiento, sin excepciones ni API500. Sin altas ni pagos.
Antes/después:15 reservas,15 stays,1 cuenta,1 vínculo,28 movimientos y huella
financiera idénticos. Migraciones34→35, únicamente003-015, sin tocar014.
Evidencia: pair-browser-result.json, pair-lookup-desktop.png, pair-runtime-*.json
en %TEMP%/pms-public-lookup-qa. No reutilizar los PASS OTP ni declarar CI global
verde: los timeouts previos generales siguen fuera del alcance de este ajuste.

Histórico de la implementación sustituida: Backend1170 PASS, focal Web28 PASS,
browser16 PASS. Su suite Web general tuvo5 timeouts de5000ms en archivos Staff/
filtros sin cambios funcionales,2 reproducidos sobre HEAD909a12c. No se cambian
timeouts, no se deshabilitan tests ni se declara CI global verde por esos resultados.

QA manual del usuario pendiente. Sin commit/push. Artefactos/logs permanecen fuera
del repositorio en %TEMP%/pms-public-lookup-qa, prefijos pair-* para esta versión.
