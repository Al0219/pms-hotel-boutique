# BE-014B-COM-01 — QA manual antes de commit/push

**Estado:** PASS; el usuario ejecutó los comandos sin errores y confirmó el
cierre de BE-014B-COM-01 el 2026-10-04. La guía se conserva para regresión.
**Rama:** `feature/bd1-commercial-permissions`.
**Alcance:** autorización interna de Company, Agency, EventGroup, RoomBlock,
Promotion y Reward con `COMMERCIAL_MANAGE`.

## Preparación

Se necesita Docker y acceso a las imágenes/dependencias del proyecto. Ejecutar
desde `backend/` en la rama indicada. El Compose de pruebas levanta PostgreSQL 17
en almacenamiento temporal, sin publicar puertos ni usar la base de la aplicación.

```bash
git branch --show-current
docker compose -p pms-bd1-manual -f compose.bd2-test.yaml run --rm verify ./mvnw -B --no-transfer-progress -Dtest=CommercialServiceIntegrationTests,GroupServiceIntegrationTests,PromotionRewardIntegrationTests,CommercialPermissionIntegrationTests verify
docker compose -p pms-bd1-manual -f compose.bd2-test.yaml down
```

La primera línea debe mostrar `feature/bd1-commercial-permissions`. La segunda
debe terminar en `BUILD SUCCESS`, **45 tests**, cero failures/errors/skipped y
exit code 0. Ejecutar la tercera línea incluso si la prueba falla para retirar
los contenedores/red de este proyecto de QA.

## Qué comprobar en el resultado

| Suite | Resultado esperado | Comportamiento ejercitado |
| --- | --- | --- |
| CommercialServiceIntegrationTests | 13 tests PASS | GERENCIA y SUPER_ADMIN crean/editan empresas y agencias; Recepción se rechaza; aislamiento por property |
| GroupServiceIntegrationTests | 13 tests PASS | Ambos roles gestionan ciclo de grupo y block/pickup; referencias de otra property no se aceptan |
| PromotionRewardIntegrationTests | 12 tests PASS | Ambos roles gestionan promociones y ledger de rewards; Recepción se rechaza; reglas de ciclo y scope conservadas |
| CommercialPermissionIntegrationTests | 7 tests PASS | Los seis servicios rechazan lecturas/escrituras sin COMMERCIAL_MANAGE, incluso con roleCode SUPER_ADMIN; también rechazan snapshot o permissions nulos |

Los reportes detallados quedan en `target/surefire-reports/`. Para ver el resumen
de esas cuatro suites:

```bash
rg 'Tests run:' target/surefire-reports/*Commercial*txt target/surefire-reports/*GroupService*txt target/surefire-reports/*PromotionReward*txt
```

Registrar `PASS` o el nombre de la suite que falló, el mensaje de error y si
Docker pudo iniciar. Enviar ese resultado al responsable de la tarea para
confirmar o corregir antes de `COMPLETADA`, commit y push.

## Alcance de esta comprobación

Las suites arrancan Spring y usan PostgreSQL real, pero construyen snapshots
Staff dentro de las pruebas. Todavía no hay controllers HTTP Commercial; por
eso no hay prueba manual válida por navegador, Swagger o Postman para estos seis
servicios. La selección de chain/JWT Staff, el actor derivado de sesión y el
refuerzo SQL de recursos relacionados quedan para incrementos posteriores de
BE-014B, antes de exponer APIs.
