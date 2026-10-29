# Detalle operativo ampliado de reservas Staff

Estado: COMPLETADA; QA manual PASS confirmado por José el 2026-10-29.
El QA inicial detectó captura incompleta en
el checkout público; corregida según contrato65 con validación técnica PASS.
La evidencia técnica inferior corresponde a la ampliación de lectura previa;
contrato65 registra las pruebas finales de captura, persistencia y consulta.
Incremento autorizado por José el2026-10-28: consultar la
información registrada del cliente/habitación con presentación compacta.
Extiende contrato49 e IMP-WEB-0302, owner José, revisores colaborativos Alan/Juan.
Rama feature/staff-reservation-detail; base b33236e. No cambia el XLSX.

## Contrato

GET `/api/v1/reservations/{reservationId}?propertyId={uuid}`, BFF existente
`/api/staff/reservations/{reservationId}?propertyId={uuid}`. Conserva Staff activo,
RESERVATION_MANAGE, organización y PROPERTY explícita resueltos antes de leer.
Guest no concede acceso. Cache-Control private,no-store; errores existentes.
Esta lectura no añade escrituras, permisos ni eventos de mutación. Contrato65
completa el guardado original e incorpora una migración aditiva para país.

Solo el detalle añade `details`, con `updatedAt` UTC, `notes` nullable, `contact`
nullable y `stays: [{stayId, occupants:[{profileId,fullName,primary}]}]`.
Contacto: profileId del responsable de esa reserva, email, phone, documentType,
documentNumberMasked, preferredLanguage y country ISO alpha-2; los textos opcionales son null
si no están registrados. El documento solo muestra máscara y como máximo sus
cuatro últimos caracteres; documentos cortos quedan totalmente ocultos.
Nunca GuestAccount, documentos originales, credenciales, PAN/CVV ni ledger.

El listado conserva su proyección mínima y omite `details`. Backend consulta
contacto y ocupantes con scope en SQL; el BFF valida IDs asociados a la reserva,
proyecta campos permitidos y descarta extras incluso si aparecen en el listado.
Clientes anteriores pueden ignorar la ampliación. Web admite temporalmente un
backend anterior sin details, indicando información adicional no disponible.

El responsable no se infiere como ocupante. Una lista vacía significa que no se
registraron ocupantes; no acredita cero personas ni permite inferir adultos/niños.
Notas proceden de Reservation; no se mezclan con preferencias del perfil personal
Guest ni con datos del navegador. Campos no persistidos por el alta original
permanecen sin registrar. Contrato65 corrige la captura para reservas nuevas.

Tipo/código/número/asignación/fechas/estado proceden de las stays persistidas.
Las fotos/descripciones reutilizan las asociaciones editoriales por código del
catálogo Web actual, identificadas como referencia del tipo, no como snapshot
de compra ni prueba de capacidad, tarifa, servicios contratados o estado operativo.
Tipo desconocido: sin fotos inventadas. Folio y pagos conservan contrato61 y sus
permisos; ni saldos ni cobros se deducen de este DTO.

## Aceptación

Pruebas Backend/BFF/mapper/UI: contacto correcto, máscara, N stays/ocupantes,
notas/ausentes, listado sin PII adicional, sesión Guest rechazada, acceso ajeno
403/404, IDs incompatibles rechazados y navegación/acciones existentes conservadas.
Responsive, teclado, galerías y tarjetas plegables; datos retirados al cambiar
sesión/property o ante un error.

## Evidencia técnica — 2026-10-29

`./mvnw -B verify`, Java21/PostgreSQL17 aislado: BUILD SUCCESS,1231 tests,
0 failures/errors/skipped. Incluye21 de lectura/asignación y25 de OpenAPI.
Web:82 pruebas relevantes en10 archivos PASS (BFF/creación, mappers, hooks y UI);
typecheck y builds de backend/frontend PASS. No se atribuye a este incremento
una nueva ejecución de la suite Web global; el CI remoto queda para publicación.

Chrome sobre frontend→backend→PostgreSQL real en3001:46 comprobaciones PASS,
Recepción y Super Admin en propiedades autorizadas con reservas existentes.
Contacto, máscara/ausentes, estancias, galería, teclado, folio plegable,
regreso al listado, logout401, inicio público y375px/escritorio. Sin JS/API5xx
ni escrituras de negocio; solo sesiones de prueba. Se corrigió el automatizador
para emitir Enter real, seleccionar una propiedad con registros y esperar el
elemento del inicio en lugar de depender del salto de línea de su título.

Contenedor PostgreSQL/volumen conservados:16 reservas,16 stays,30 movimientos,
17 perfiles y36 migraciones; hashes de reservas/estancias/finanzas/perfiles
iguales antes/después. Capturas, reportes y logs sanitizados fuera de Git en
`%TEMP%/pms-staff-reservation-detail-qa`. Backend/Web reales actualizados y
saludables en3001. Sin commit/push/merge. Esperar QA manual PASS de José.
