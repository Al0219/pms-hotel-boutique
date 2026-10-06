# 43 — Disponibilidad pública A3: contrato y QA

Estado A3 **COMPLETADA**; A2 **COMPLETADA**, A1 **COMPLETADA**. Owner Alan / BD1.
Rama `feature/backend-public-availability`, base `b653804`, 2026-10-06.
Contrato aprobado por el usuario; QA manual A2/A3 **PASS** confirmado por Alan;
cierre formal autorizado el 2026-10-06. Incremento público superior PENDIENTE.

## HTTP aprobado

`GET /api/v1/public/availability?propertyId={{propertyId}}&arrival=2026-11-01&departure=2026-11-03&rooms=1`

Sin Authorization ni cookie requerida. Solo esta ruta GET pública; no otras rutas
Staff/Guest. Parámetros obligatorios UUID, ISO LocalDate, ISO LocalDate e int;
arrival < departure y rooms > 0. No hay alias `roomsRequested`.
Property debe tener el estado existente `ACTIVE`; `INACTIVE` no es elegible.
No crea nuevos estados de publicación ni exige GuestAccount o Staff session.

| Response | Campos exactos |
| --- | --- |
| PublicAvailabilityResponse | propertyId UUID; arrival/departure date; currency String GTQ; offers array |
| PublicAvailabilityOfferResponse | roomTypeId UUID; roomTypeCode/name String; ratePlanId/code String; availableUnits int; nightlyRateMinor/totalMinor long |

Identidad real de RoomType, nombres/códigos reales de PostgreSQL. DemoRatePolicy
mantiene la única autoridad de precios: DEMO_STANDARD (STD/CLASSIC/STANDARD/KING/
TWIN) 65000; DEMO_DELUXE (DELUXE/DLX) 85000; DEMO_SUITE (SUITE) 120000 GTQ/noche.
ratePlanId y ratePlanCode son el mismo identificador demo String, no UUID persistido.
totalMinor es por habitación para todas las noches, sin multiplicar rooms; rooms
solo filtra capacidad. No impuestos, descuentos, conversiones ni servicios externos.

AvailabilityPort/AvailabilityService conservan la autoridad ATS: mínimo vendible
por noche [arrival, departure), habitaciones físicas menos OOO vigente y stays
consumidores; overbooking=0. Solo ofertas con ATS >= rooms. Orden lexical por code.
Lectura readOnly sin asignación, admisión, reserva, auditoría de escritura ni
idempotency key; no garantiza stock al reservar posteriormente.

| Estado | Semántica |
| --- | --- |
| 200 | Ofertas reales o offers=[] si catálogo vacío/ATS insuficiente |
| 400 | Parámetro obligatorio ausente, UUID/fecha/int inválido, arrival >= departure, rooms <= 0 |
| 404 | Property inexistente o INACTIVE; mismo ProblemDetail sin revelar estado |
| 500 | ProblemDetail con code DEMO_RATE_NOT_CONFIGURED o DEMO_CURRENCY_MISMATCH; sin offers parciales ni mensajes internos |

DTO HTTP separados de views application. No campos Staff, organizationId,
permisos, sesiones, Guest/PII ni configuración financiera interna en el response.
OpenAPI declara params, schemas, cuatro status, security=[] y x-audience=public.
Los cuatro security schemes existentes siguen vigentes para sus operaciones.

## Preparación manual mínima y reversible propuesta

Mecanismos existentes inspeccionados: `compose.auth-manual-qa.yaml` ofrece
PostgreSQL tmpfs/Backend/Staff bootstrap de credenciales desechables; 14 y 22
documentan crear catálogo mediante CRUD Staff/colecciones Postman. No hay loader
aprobado que cree específicamente STD/DLX/SUITE; no se agrega seed productivo.

Propuesta para preparar QA después de revisar A3, **no ejecutada en esta entrega**:

1. Usar el perfil existente aislado, sin `.env` de aplicación:
   `docker compose -p pms-public-manual -f backend/compose.auth-manual-qa.yaml --profile manual-qa up -d --build`.
   Puerto local 18086; comprobar antes que esté libre. No modificar Compose.
2. Login Staff con el bootstrap ya definido en ese perfil. No guardar/exportar
   tokens. Usar APIs Staff/colecciones BD2 Properties, RoomTypes y Rooms.
3. Crear una Property con código `PUBLIC-QA`, nombre `Public QA`, timezone
   `America/Guatemala`, currency `GTQ`. CRUD existente la crea ACTIVE; guardar
   su UUID real de respuesta como propertyId.
4. Crear RoomTypes `STD`/`Standard QA`, `DLX`/`Deluxe QA`, `SUITE`/`Suite QA` en
   esa Property; guardar UUIDs reales. Crear dos Rooms para cada tipo con códigos
   únicos `STD-01/02`, `DLX-01/02`, `SUITE-01/02`. No RatePlans demo persistidos.
5. Probar availability sin token/cookie con rooms=1/2 y rooms=3, rango de dos
   noches. Esperados: tres ofertas para 1/2, ninguna para 3; nightly/total
   65000/130000, 85000/170000, 120000/240000; orden DLX, STD, SUITE.
6. Ejecutar errores 400, UUID inexistente 404, y comprobar Staff vecino anónimo
   401. INACTIVE y configuración errónea están cubiertos con fixtures de tests;
   no cambiar estado/moneda de datos normales para fabricar QA manual.
7. Retirar solo este proyecto: `docker compose -p pms-public-manual -f backend/compose.auth-manual-qa.yaml --profile manual-qa down`.
   La BD tmpfs es descartable; no necesita DELETE productivo ni migración rollback.

Colección BD1 incluye la nueva request con auth `noauth`. Configurar baseUrl del
perfil, propertyId y fechas; el bootstrap/colecciones demo no sustituyen la
aprobación manual de los resultados. No ejecutar preparación contra producción.

## Evidencia técnica

Baseline OpenAPI previo leído del runtime: 35 operaciones/25 paths/32 schemas/
10 tags. Posterior generado y vivo: 36 operaciones/26 paths/34 schemas/11 tags;
paridad con mappings y paths/components vivos PASS. Focalizados 48 PASS (21 HTTP,
14 application, 11 OpenAPI, 2 seguridad); verify 449 PASS sin exclusiones, cero
fallos/errores/omitidos, Java 21/PostgreSQL 17.11. git diff --check PASS.

Smoke en JAR validado/Compose efímero puerto 18087: /v3/api-docs, Swagger UI HTML
y swagger-config 200, GET público sin credenciales 200 offers=[], rooms=0 400,
Property inexistente 404, Staff vecino anónimo 401. BD solo con Property seed
ACTIVE GTQ y cero RoomTypes; no se pobló catálogo, no se tocó stack normal y se
retiró el runtime de smoke. Esto valida contrato/mapping/infraestructura; no QA
manual de ofertas vendibles ni render visual del navegador. Preparación propuesta
arriba no se ejecutó durante esa entrega técnica. Evidencia en AlanPlan/Handoff y baseline 39; logs
/tmp/pms-public-a3-focused.log, /tmp/pms-public-a3-verify.log y
/tmp/pms-public-a3-runtime-smoke.json. El resultado manual posterior consta abajo.

## Resultado QA manual A2/A3 — PASS (Alan, 2026-10-06)

Alan confirma entorno QA aislado levantado, login Staff sintético PASS y catálogo
creado por CRUD: Property ACTIVE/GTQ, STD/DLX/SUITE, dos Rooms físicas por tipo.

| RoomType | availableUnits | nightlyRateMinor | totalMinor (dos noches) |
| --- | ---: | ---: | ---: |
| STD | 2 | 65000 | 130000 |
| DLX | 2 | 85000 | 170000 |
| SUITE | 2 | 120000 | 240000 |

rooms=1 y rooms=2 → tres ofertas PASS; rooms=3 → 200 offers=[] PASS.
Fecha inválida, rooms=0 y UUID inválido → 400 PASS; Property inexistente → 404 PASS.
Availability sin token → 200 PASS; endpoint Staff vecino sin token → 401 PASS.
OpenAPI path presente, operationId=publicAvailability, security=[] y Swagger UI
200 PASS. Cleanup del entorno QA completado. A2/A3 COMPLETADAS; A1 COMPLETADA.
Procedimiento y evidencia técnica anteriores conservados; este QA manual fue
ejecutado y confirmado por Alan, sin atribuirlo al agente.
