# 02 — API Contract Policy Backend

Backend es fuente del contrato CONFIRMED.

Para cada endpoint documentar:
- method;
- path;
- auth;
- permission;
- property scope;
- request;
- response;
- errors;
- idempotency;
- audit;
- examples.

Frontend DTO provisional no obliga Backend.


## OpenAPI/Swagger en cada incremento HTTP

Todo endpoint HTTP nuevo o modificado debe actualizar y validar OpenAPI/Swagger
dentro del mismo incremento. El contrato generado debe coincidir con las fuentes
de verdad aprobadas (precedencia global de docs/01_SOURCE_OF_TRUTH.md); DTOs,
mocks o ejemplos no sustituyen esa aprobación. Un endpoint no cumple DoD si
Swagger/OpenAPI queda desactualizado.

Usar springdoc existente y comprobar el documento real de /v3/api-docs en tests
o QA. Contrastar paths/métodos con los mappings de controllers y validar DTOs,
parámetros, límites/nullability, respuestas, auth/permisos/scope y headers/cookies
aplicables. Cubrir regresiones con aserciones estructurales, sin depender del
orden del JSON. No ajustar comportamiento HTTP para concordar con una anotación:
registrar el gap concreto si código y contrato aprobado discrepan.

Cada exclusión de OpenAPI debe ser explícita y justificada en el inventario del
incremento (mapping, motivo y fuente), e incorporada a la prueba de cobertura.
Los endpoints BFF-only aprobados son contratos internos de integración; indicar
esa audiencia, nunca presentarlos como API anónima de negocio. Actuator/error/
Swagger son infraestructura y no forman parte del inventario de negocio.

No añadir ejemplos con contraseñas, tokens, OTP, secretos, PAN/CVV o PII
innecesaria. Representar los esquemas Bearer/cookie reales; documentar una cookie
solo donde Backend la recibe y no atribuirle Set-Cookie que emite el BFF.
Baseline y cobertura vigente:
[39_BACKEND_OPENAPI_BASELINE.md](39_BACKEND_OPENAPI_BASELINE.md).
