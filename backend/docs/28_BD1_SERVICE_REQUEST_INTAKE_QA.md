# BE-014B-OPS-01 — QA de intake Staff de ServiceRequests

Esta entrega agrega `SERVICE_REQUEST_INTAKE` al catálogo RBAC para RECEPCION y
SUPER_ADMIN. Un puerto interno Staff permite abrir, consultar y listar
ServiceRequests en una PROPERTY autorizada. GERENCIA/OPERACIONES siguen usando
`OPERATIONS_MANAGE` para ese puerto. No crea rutas HTTP ni habilita a Recepción
para transiciones, asignación, mantenimiento o mensajería externa.

La entrada valida sesión y permisos vigentes, limita los queries por property,
toma el actor de la sesión y rechaza vínculos a Reservation, Stay, Room o
GuestProfile de otra property. El master GuestProfile compartido sin property
asignada queda fuera de esta entrada hasta resolver AD-05. El servicio BD3
original de transiciones continúa interno; requiere guard antes de exponerse.

## QA manual en PostgreSQL aislado

Desde `backend/`:

```bash
docker compose -p pms_bd1_intake -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress \
  '-Dtest=StaffServiceRequestServiceIntegrationTests,ServiceRequestServiceIntegrationTests' test
docker compose -p pms_bd1_intake -f compose.bd2-test.yaml run --rm verify \
  mvn -B --no-transfer-progress verify
docker compose -p pms_bd1_intake -f compose.bd2-test.yaml down -v
```

Esperado: las suites focalizadas pasan 9 pruebas y `verify` pasa 306 pruebas,
ambos con `BUILD SUCCESS` y cero failures/errors. La nueva suite comprueba las cinco categorías, actor
Staff verdadero aunque el comando incluya otro `reportedBy`, ausencia de
permiso/sesión/property, detalle/listado scoped y rechazo de Room ajena. La
suite BD3 anterior confirma que sus operaciones internas conservan su
comportamiento. `down -v` elimina solo el volumen aislado de esta prueba.

No hay endpoint que probar con Postman en este incremento. La futura API/BFF
requiere un contrato propio y debe invocar únicamente la entrada Staff protegida.
