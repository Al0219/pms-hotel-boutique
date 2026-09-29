# 01 — Backend Architecture

## Decisión aprobada

El Backend se implementa como monolito modular con Spring Boot y arquitectura
por capas dentro de cada módulo:

```text
Controller -> Service interface -> Service implementation -> Repository -> Entity
                      |
                      -> DTO / Mapper
```

- **Controller:** protocolo HTTP, DTOs, validación sintáctica y respuestas.
- **Service:** reglas de negocio, autorización contextual y transacciones.
- **Repository / Entity:** persistencia PostgreSQL.
- **Mapper:** conversión entre transporte, dominio y persistencia.

Las entidades no se exponen como respuestas API. Controllers no contienen lógica
de negocio ni consultas SQL.

## Foundation técnica

- Java 21, Maven y Spring Boot.
- Spring MVC, Bean Validation, Spring Data JPA y PostgreSQL.
- Liquibase como único mecanismo de cambios de esquema.
- Spring Security con `SecurityFilterChain`; las sesiones HTTP son stateless.
- JWT internos, OAuth2/OIDC y refresh tokens se incorporan en las tareas de
  identidad de `AlanPlan.md`.
- OpenAPI/Swagger se genera desde controllers y contratos confirmados.

Un módulo nace únicamente cuando una tarea READY necesita uso real.
