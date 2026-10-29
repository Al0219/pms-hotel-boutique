# Panel Staff con datos reales

## Rediseño del resumen de recepción — 2026-10-27

Incremento autorizado por José después de confirmar los checks del PR financiero.
Rama `feature/staff-dashboard-overview`. Estado **EN_QA**; el cierre anterior
corresponde a la integración original, no a este nuevo diseño.

Alcance: mejorar `/dashboard` para una PROPERTY concreta con el lenguaje visual
existente (crema, verde oliva, títulos Serif y tokens semánticos). Reutiliza las
tres lecturas BFF ya confirmadas, sus mappers y claves por sesión/propiedad;
sin endpoints, permisos, dependencias, migraciones ni cambios Backend nuevos.
Las filas IMP-WEB-0013 / IMP-WEB-0906 se revisaron: el incremento visual solicitado
no completa el dashboard consolidado ALL_PROPERTIES de IMP-WEB-0906 ni edita XLSX.

- Encabezado con nombre del hotel, acceso a Reservas y actualización explícita.
- Tres totales originales: reservas padre, N estadías e inventario físico.
  Representan todos los registros de la propiedad, incluidos históricos.
- Distribución de reservas por estado operativo derivado por el módulo Reservas;
  no se infiere ocupación física ni se cuentan las stays como reservas padre.
- Inventario agrupado por identidad de RoomType, con cantidades y barras
  proporcionales; no equivale a ATS ni a habitaciones libres o limpias.
- Cinco últimas reservas en el orden contractual createdAt DESC / ID ASC de la
  API49: referencia, huésped, fechas, noches, habitaciones, estado y enlaces al
  detalle. Campos ausentes se muestran explícitamente, sin datos de relleno.
- Accesos a Reservas/Habitaciones/Calendario, responsive y foco visible.
- Carga, cambio de propiedad/sesión, refresco y errores ocultan todo el resumen
  anterior. Vacíos confirmados muestran cero y mensajes útiles. Reintento y
  Actualizar datos consultan ambas fuentes. Guest/Staff y guards conservados.

No se agregan ingresos, ADR/RevPAR, porcentajes de ocupación ni saldos agregados:
las fuentes actuales del panel no confirman esas métricas. No hay escrituras
de reservas, inventario ni movimientos financieros desde esta pantalla.

Aceptación automatizada: 47 tests / 3 archivos PASS (dashboard real, regresión
Guest/Staff y composición de propiedad), `npm run typecheck` y `npm run lint`
PASS. Se agregan casos de N stays/estados padre, listado limitado con datos
ausentes y refresco explícito sin datos antiguos. No se amplían timeouts ni se
excluyen tests del workflow. `npm run build` en imagen Node24 PASS; validación
de tipos separada porque el build existente omite ese chequeo.

Revisión móvil: se reforzó la comprobación comparando scrollWidth con clientWidth
y viewport390. Detectó un encabezado accesible absoluto que escapaba del scroll
de la tabla; se contiene con position:relative en ese contenedor. Se conserva
el texto para lectores de pantalla y el scroll horizontal propio de la tabla,
sin ocultar el desbordamiento global del documento.

Chrome real sobre Docker3001: 14 comprobaciones PASS con Recepción. Totales
contrastados con GET reales de reservas/habitaciones, estados e inventario,
cinco filas recientes, refresco, enlace al detalle, escritorio/móvil sin
desbordamiento del documento y logout a Inicio. Sin excepciones JS, errores500
ni pagos registrados. Capturas revisadas; logs/reportes fuera de Git en
`%TEMP%/pms-staff-dashboard-qa`. Se actualizó solo Web; los contenedores Backend y
PostgreSQL, su volumen y la configuración runtime se conservaron. No se atribuye
CI remoto nuevo ni QA manual del owner para este incremento.
José autorizó publicar este incremento mediante commit y push; se conserva
EN_QA hasta completar la aceptación manual y los checks correspondientes.

QA manual pendiente del nuevo diseño: abrir `/dashboard` en3001 con Staff,
comparar totales y estados con Reservas, abrir un detalle, volver y actualizar;
revisar escritorio/móvil, cambio de propiedad si existe y logout hacia Inicio.
Después, retomar el QA financiero anterior: abono → deuda aún bloquea checkout →
pago total → salida habilitada según lifecycle → habitación sucia → limpieza e
inspección. Mantener el pago público simulado según la decisión docente.

## Integración original — evidencia histórica

Estado: **COMPLETADA**, 2026-10-08; QA manual **PASS** confirmado por Alan.
Incremento autorizado por Alan; rama `feature/staff-dashboard-real`.
Sin commit/push/merge; sin edición del XLSX ni cierre de tareas Backend.

## Alcance y trazabilidad

Integra el Panel de recepción existente de `/dashboard` con PropertyContext y
las lecturas reales de Reservas e inventario. La fila relacionada de routing es
IMP-WEB-0013 (COMPLETADA); IMP-WEB-0906 figura PENDIENTE y corresponde al dashboard
multi-property consolidado (WEB-2, reviewer WEB-4), que tiene otro alcance.
La solicitud actual autoriza este incremento de integración para PROPERTY,
con sus criterios explícitos; no declara completada IMP-WEB-0906.
Owner de integración: Alan; composición Staff WEB-3 y revisión de dominio WEB-4
según el alcance Staff existente de la [guía52](52_PRIVATE_STAFF_CORE.md).

DoR de integración: sesión Staff y PropertyContext existentes, lectura de
Reservas aprobada/completada y lectura real de Habitaciones disponible.
Fuentes: [Reservas49](../../../backend/docs/49_STAFF_RESERVATIONS_READ_CONTRACT.md),
[Rooms17](../../../backend/docs/17_BD2_ROOMS_CRUD_CONTRACT.md),
[RoomTypes16](../../../backend/docs/16_BD2_ROOM_TYPES_CRUD_CONTRACT_PROPOSAL.md),
[scope](../../../docs/05_PROPERTY_SCOPE.md),
[Habitaciones58](58_STAFF_ROOMS_REAL_READ_QA.md).
No necesita nuevo endpoint ni contrato de métricas.

## Cierre confirmado — 2026-10-08

Alan confirmó «QA manual PASS» y autorizó marcar el incremento **COMPLETADA**.
Aceptación y DoD del alcance de integración: **PASS**; EN_QA → COMPLETADA.
Se incluye la limpieza autorizada del header: retirada de nombre/ID de la
propiedad, frase introductoria y explicación visible de totales, conservando
KPIs, navegación y lógica de datos. La propiedad sigue disponible en el menú Staff.

La confirmación corresponde al owner; no se atribuye al agente una nueva
validación de navegador/BD ni resultados individuales de casos no informados.
Evidencia previa de integración: 59 tests / 6 archivos, typecheck, lint y build
mocks=false PASS. Tras la limpieza: 25 tests / 2 archivos y diff-check PASS.
Cierre exclusivamente documental: `git diff --check` PASS; código funcional
previo preservado, sin repetición de suites ni CI remoto/publicación.
El cierre queda registrado en AlanPlan y AlanHandoff para este incremento Web,
sin cambiar estados de otras tareas Backend ni IMP-WEB-0906/XLSX.

## Comportamiento y aceptación

- App resuelve una PROPERTY autorizada desde `usePropertyScope` y la sesión
  Staff, sin property fija ni variable de entorno. Antes de readiness no consulta;
  scope ausente/ALL_PROPERTIES exige seleccionar un hotel específico.
- `StaffPanel` consume APIs públicas `useReservationCenter` y `useRooms` con
  `/api/staff/reservations`, `/api/staff/rooms`, `/api/staff/room-types` y propertyId,
  con ambos flags de mocks. Conserva Service → DTO → Mapper → Domain → Hook → UI.
- KPIs: cantidad de reservas registradas (incluye headers sin stays), suma de
  estadías registradas y cantidad de habitaciones físicas. Una reserva con N
  stays cuenta una vez como reserva y N como estadías. Son totales del listado
  completo confirmado, incluidos históricos/cancelados, sin filtro de fecha.
  El alcance de los totales queda documentado aquí. No hay ingresos, ADR/RevPAR, ocupación,
  disponibilidad vendible, limpieza ni indicadores sin fuente.
- Vacío confirmado muestra cero y avisos específicos. Carga/refresco oculta
  todos los KPIs; error de cualquiera de las fuentes oculta los KPIs y permite
  reintentar ambas consultas. No presenta error como cero ni una lectura parcial.
- Remonta por sesión/property; las claves de ambas queries incluyen sesión y
  propiedad. No usa placeholder de otra propiedad. Volver a una propiedad
  cacheada refresca y oculta sus valores mientras consulta. Cambiar sesión crea
  queries independientes. Se aprovechan AbortSignal, validación de scope,
  invalidaciones y refetch al foco existentes. No polling ni mutaciones nuevas.
- Navegación explícita a `/reservas`, `/staff/habitaciones`, `/calendario`.
  Se conservan guards Staff y separación Guest/Staff.

La API pública de Reservas expone deliberadamente el hook de listado existente;
se añade sessionId opcional al final de su query key para este consumidor.
Los consumidores anteriores y las invalidaciones por prefijo conservan su uso.
No modifica permisos, BFF ni Backend. El CSS del Panel se traslada al módulo
que presenta la pantalla; `page.tsx` queda como composición.

## Validación automatizada

Desde `frontend/pms-hotel-web`:

```bash
npm run test -- 'src/app/(private)/dashboard' 'src/app/(private)/staff-property-workspace.test.tsx' src/modules/reservations/hooks/use-staff-reservation-read.test.tsx src/modules/reservations/mappers/staff-reservation.mapper.test.ts src/modules/rooms/mappers/staff-inventory.mapper.test.ts
npm run typecheck
npm run lint
NEXT_PUBLIC_USE_MOCK_API=false npm run build
git diff --check
```

PASS: 6 archivos / 59 tests (ejecutados en dos llamadas: 48 de regresión y
11 específicos del Panel). Typecheck, lint, build mocks=false y diff-check PASS.
El build omite validación de tipos por la configuración existente; typecheck se
verificó separadamente. Los tests usan respuestas sintéticas MSW con contratos
reales; no acreditan QA manual de navegador/BD ni CI remoto.

## Guía de QA manual — PASS confirmado por Alan

Con Backend/DB y BFF configurados como en Reservas/Habitaciones reales:

```bash
cd /mnt/Datos/Proyectos/GitHub/pms-hotel-boutique/frontend/pms-hotel-web
NEXT_PUBLIC_USE_MOCK_API=false npm run dev
```

1. Acceder por `/acceso` con Staff autorizado para leer Reservas
   (RESERVATION_MANAGE) y una propiedad activa. Abrir `/dashboard` y comprobar
   la propiedad seleccionada en el menú Staff. En Network verificar los tres GET BFF con ese
   propertyId, sin requests a pms.test ni transporte mock.
2. Comparar los KPIs con los arrays de respuestas reales: reservas = longitud
   del listado; estadías = suma de las longitudes de `stays`; habitaciones =
   longitud de Rooms. Usar registros existentes, incluyendo una reserva con
   varias stays y headers sin stays si existen. Históricos/cancelados también
   cuentan. No publicar cuerpos con PII, cookies ni tokens como evidencia.
3. Abrir los tres accesos y comprobar Reservas, Habitaciones y Calendario para
   el mismo hotel. Volver al Panel; verificar que refresca los datos. Tras una
   creación real de inventario con el flujo existente autorizado, comprobar
   que la siguiente lectura muestra el total actualizado.
4. Con dos memberships autorizados y Network lento, cambiar A → B → A,
   también antes de que termine una lectura. Durante la carga no quedan KPIs
   de la propiedad anterior ni vuelven al llegar respuestas tardías; al terminar
   corresponden solo al hotel visible. Si no existe un segundo membership,
   registrar el caso como no ejecutado; no inventar propiedades/autorizaciones.
5. Si la sesión ofrece ALL_PROPERTIES, seleccionarlo: debe pedir una propiedad
   concreta y no consultar datos globales. Volver a una PROPERTY y verificar
   nueva lectura. Probar propiedad sin reservas/habitaciones si existe: cero
   únicamente tras respuesta correcta vacía y aviso específico.
6. En DevTools bloquear uno de los GET o simular offline y recargar el Panel:
   error recuperable sin KPIs cacheados/cero simulado. Desbloquear y Reintentar:
   vuelve el resumen tras lecturas correctas. Repetir con la lectura de tipos.
7. Cerrar sesión Staff: acceso privado protegido y regreso a `/`. Una sesión
   Guest sola no abre el Panel. Verificar teclado, foco de accesos/reintento y
   ancho móvil sin recortes ni superposición.

QA manual PASS confirmado por Alan para el incremento actual. La guía conserva
los límites de casos sin fixtures; no se inventan resultados individuales.
Incremento cerrado; nuevo trabajo o publicación requieren autorización independiente.
