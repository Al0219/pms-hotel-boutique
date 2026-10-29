# Detalle ampliado de reservas Staff

Incremento autorizado por José,2026-10-28. IMP-WEB-0302, owner WEB-3/José,
revisión colaborativa WEB-4/Alan/Juan. Dependencias: listado y detalle49,
asignación50, ciclo54, folio61 implementados. Rama feature/staff-reservation-detail,
base b33236e; sin editar XLSX. Estado COMPLETADA: QA manual PASS confirmado por José; corregida la pérdida de datos
detectada por José al crear la reserva pública; contrato65 y validación técnica
PASS. La evidencia de lectura previa se conserva como historial del incremento.
Contrato [Backend64](../../../backend/docs/64_STAFF_RESERVATION_DETAILS_CONTRACT.md).

## Alcance

Ruta `/reservas/{reservationId}`, sesión Staff/RESERVATION_MANAGE, PROPERTY
concreta. Resumen compacto de fechas, N stays, noches de habitación (suma por
stay, no duración común inventada) y asignaciones. Tarjetas plegables para:

- Responsable/contacto: nombre, email, teléfono, país, idioma y documento enmascarado.
- Notas/referencias: notas registradas, origen/referencia, moneda e IDs/UTC.
- Cada estancia: fechas, estado, tipo/código y habitación física, ocupantes
  explícitos, galería referencial del catálogo actual e identificadores plegados.
- Folio y pagos: componente existente y permisos financieros conservados,
  ahora bajo una sección plegable. No se deduce el saldo de la reserva.

Se mantienen asignación y check-in/check-out visibles por estancia. El folio
no se desmonta al plegar para conservar su operación/draft en curso. La galería
solo monta al expandir; tipo sin contenido no recibe fotos de otro tipo.
`No registrado`/`no disponible` distingue campos nulos o backend anterior.
Responsable no equivale a ocupante. No adultos/niños/capacidad/precio inventados;
no se mezclan preferencias del perfil personal Guest con contactos históricos.
El checkout público envía teléfono internacional, país ISO, documento y solicitudes
especiales mediante allowlist de contrato65; se guardan en perfil/reserva.
Los datos viven en memoria durante el checkout y se limpian al confirmar.
No se recuperan inputs de reservas antiguas que nunca se guardaron.

Service→DTO→mapper→Domain→hook→UI. BFF valida asociaciones profile/stay y máscara,
descarta extras e impide contacto adicional en el listado. Clave del detalle
incluye sesión Staff cuando se proporciona; cambiar identidad/property/reserva
no reutiliza contacto ni estado de tarjetas anteriores. Error sustituye el detalle.
Sin nuevas dependencias, permisos o credenciales. Contrato65 añade país nullable
con migración aditiva y completa la escritura atómica existente del alta pública.

## QA manual del owner

Validación final de la corrección,2026-10-29:114 pruebas relevantes/11 archivos,
ESLint, TypeScript y builds PASS. Backend completo1241 PASS, incluidos los11
casos de perfil personal que comprueban la selección explícita de country.
Chrome real3001:35 PASS, una reserva desde formulario público, petición completa,
lectura persistida como Recepción/Super Admin, máscara, móvil y logout401.
Referencia ficticia NNU6E7QMZH; sin JS/API5xx. Los registros anteriores y sus
huellas se conservaron; solo alta de QA y migración aditiva. Evidencia fuera de
Git: %TEMP%/pms-public-booking-details-qa. QA manual de José PASS; commit/push autorizados.

Crear primero una reserva nueva desde el checkout público de3001: completar
teléfono, elegir país/región, documento y solicitudes especiales. Confirmar con
el pago simulado existente y guardar el código. Tras iniciar sesión Staff, abrir
esa reserva y verificar contacto y notas; recargar y comprobar que persisten.
Documento: solo máscara y últimos cuatro caracteres, no identificación completa.
Las reservas anteriores que perdieron inputs no se completan artificialmente.

1. Entrar como Recepción y como Super Admin en3001; Reservas→abrir una reserva.
2. Resumen compacto; abrir contacto y notas. Comparar datos reales, ausentes
   explícitos y documento protegido. El nombre del responsable no añade ocupantes.
3. Abrir cada estancia; fechas/tipo/asignación correctos, ocupantes registrados
   y fotografías por código. Usar flechas/miniaturas/teclado y plegar de nuevo.
4. Abrir Folio y pagos; verificar cargos/abonos/saldo existentes. Plegar no debe
   perder una operación o borrador. No ejecutar pagos para una prueba readonly.
5. Corroborar asignación/check-in/check-out en los estados donde ya aplican.
6. Probar375px y escritorio, teclado Enter/Espacio, texto largo, regreso/listado,
   recarga, otra reserva/property y logout. Sin datos anteriores o desbordamientos.

## Validación técnica — 2026-10-29

- Backend Java21/PostgreSQL17 aislado: `./mvnw -B verify` BUILD SUCCESS,
  1231 tests,0 failures/errors/skipped. Swagger incluido.
- Web:82 pruebas relevantes en10 archivos PASS. Primer focal68/69 por timeout
  del hook de importación del BFF; se aísla únicamente el POST ajeno a las pruebas
  GET y se verifica también su suite real de creación (12 casos PASS).
  Contacto/galería4, mapper ampliado9 y aislamiento por sesión cubiertos.
  Reporte agregado conserva la evidencia más reciente por archivo, sin borrar
  los reportes originales ni aumentar tiempos/excluir pruebas del build.
- Lint/typecheck globales y builds de backend/frontend PASS. No se declara una
  nueva corrida Web global ni CI remoto del incremento; publicación pendiente.
- Chrome real3001:46 comprobaciones PASS, Recepción y Super Admin, desktop1440
  y móvil375, tarjetas plegables, galería, Enter, referencias, folio, regreso,
  logout401 y página pública. Sin excepciones JS, API5xx ni escrituras de negocio.
  Las correcciones del harness (Enter/propiedad/espera del inicio) permanecen
  fuera del repositorio; no se cambiaron reglas del producto para conseguir PASS.
- PostgreSQL preservado:16 reservas/16 stays/30 movimientos/17 perfiles/36
  migraciones. Huellas de reservas, estancias, finanzas y perfiles idénticas.

El Compose habitual sirve la implementación actualizada en3001; backend y web
saludables. Evidencia fuera de Git: `%TEMP%/pms-staff-reservation-detail-qa`.
`browser-result.json`, `web-aggregate.json`, `data-comparison.json`, logs de Maven
y builds, capturas `Recepcion-*`/`SuperAdmin-*`. QA manual del owner pendiente;
no declarar COMPLETADA hasta su confirmación. Sin commit/push/merge.
