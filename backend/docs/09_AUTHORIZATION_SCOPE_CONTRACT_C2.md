# C2 — Autorización Staff y Property Scope

**Estado:** APPROVED  
**Fecha:** 2026-09-29  
**Decisión de producto:** Staff tiene un único rol fijo; `SUPER_ADMIN`,
`GERENCIA`, `RECEPCION`, `OPERACIONES` y `AUDITOR` son los roles del V1.

C2 complementa C1. C1 sigue siendo la autoridad para identidad Staff, cookies
BFF, JWT, refresh y separación Guest/Staff.

## Modelo de acceso

- Una `Organization` agrupa propiedades. El seed inicial es `PMS Hotel Boutique`
  (`HOTEL_BOUTIQUE`), con `Hotel Boutique` (`HB-GT-001`), zona
  `America/Guatemala` y moneda `GTQ`.
- En V1 cada usuario Staff posee una sola `organization_membership` y un único
  `role_code` activo. Las propiedades activas de esa membership forman su
  conjunto autorizado.
- `SUPER_ADMIN` recibe todas las propiedades activas de su organización. Los
  demás roles reciben solamente filas activas de `membership_properties`.
- Un usuario Staff sin membership activa no puede iniciar ni conservar sesión.
  Para roles que no son `SUPER_ADMIN`, una membership sin propiedad activa
  tampoco habilita acceso.
- Las tablas y el catálogo son gestionados por Liquibase. Los roles son
  `system_managed`: V1 no permite crearlos ni modificarlos desde UI.

## Permisos efectivos

| Rol | Permisos |
| --- | --- |
| `SUPER_ADMIN` | Todo el catálogo, en todas las propiedades activas autorizadas. |
| `GERENCIA` | `MULTI_PROPERTY_READ`, `STAFF_MANAGE`, reservas, operaciones de folio/pago, devolución/anulación, operaciones, comercial, auditoría y night audit. Su conjunto sigue limitado a sus properties membership. |
| `RECEPCION` | `RESERVATION_MANAGE`, `FOLIO_PAYMENT_OPERATE`. No devuelve ni anula pagos. |
| `OPERACIONES` | `OPERATIONS_MANAGE`. |
| `AUDITOR` | `AUDIT_READ`, solo lectura. |

`GERENCIA` puede gestionar Staff dentro de su conjunto de propiedades y no
puede crear ni asignar `SUPER_ADMIN`. El flujo administrativo y sus endpoints
se definen en una tarea posterior; C2 no publica una API de provisionamiento.

## Regla de scope que deben usar los módulos operativos

Antes de ejecutar una consulta u operación property-scoped, el servicio debe
resolver uno de estos valores con `PropertyScopeResolver`:

```text
PROPERTY(propertyId)       -> el ID solicitado está en la membership activa.
ALL_PROPERTIES(propertyIds)-> requiere MULTI_PROPERTY_READ y contiene solo
                              IDs activos autorizados de la sesión.
```

El repositorio recibe el `AuthorizedPropertyScope` resultante y usa sus IDs en
la consulta SQL. Está prohibido consultar todas las propiedades y filtrar el
resultado en memoria. No existe fallback de `PROPERTY` a `ALL_PROPERTIES`.

## Contrato de sesión Staff para BFF

`GET /api/v1/staff-auth/session` conserva el acceso Staff autenticado y ahora
incluye la autorización vigente. El resultado no contiene access token,
refresh token ni contraseña.

| Campo Backend | Semántica |
| --- | --- |
| `staffUserId`, `sessionId`, `username`, `roleCode` | Identidad de la sesión Staff actual. |
| `permissions` | Permisos efectivos, recalculados desde el catálogo. |
| `memberships` | Propiedades activas autorizadas, con `propertyId`, `propertyCode`, `name`, `timezone` y `currency`. |

El Frontend actual usa una fixture exclusivamente local (`Private-09`) con
nombres y roles mock. BE-005 debe crear un DTO/Mapper BFF explícito entre esta
respuesta y el modelo Web, en vez de conectar la UI a la fixture o asumir que
sus nombres (`role_id`, `user_name`, `status`) son API Backend.

### Rutas BFF Web de BE-005

Las rutas públicas de Next.js son una fachada del mismo origen; Spring Boot
permanece en la red interna de Compose. Se aplican las cookies Staff `HttpOnly`,
`SameSite=Lax`, host-only y `Secure` bajo HTTPS. Nunca se devuelven tokens al
JavaScript del navegador.

| Ruta BFF | Método | Resultado |
| --- | --- | --- |
| `/api/auth/staff/session` | `POST` | Reenvía username/contraseña solo al Backend, crea cookies Staff y devuelve `{ authenticated: true }`. |
| `/api/auth/staff/session` | `GET` | Devuelve exclusivamente la sesión C2 actual. |
| `/api/auth/staff/refresh` | `POST` | Reenvía la cookie `pms_staff_refresh`, rota ambos tokens y devuelve `{ refreshed: true }`. |
| `/api/auth/staff/session` | `DELETE` | Revoca la sesión Staff y elimina solo sus cookies; responde `204`. |

`pms_staff_access` tiene path `/` y vida corta; `pms_staff_refresh` tiene path
`/api/auth/staff/refresh` y vida máxima de siete días. Estas cookies no se
comparten con Guest ni habilitan acceso si la autorización Backend cambió.

## Cambios de acceso

Un cambio posterior de rol, estado, contraseña o membership debe revocar las
sesiones y refresh tokens del Staff afectado. Los permisos y memberships nunca
se incluyen en el JWT: se resuelven desde PostgreSQL para cada petición.

## Fuera de alcance

- Google/OIDC, GuestAccount y vínculo de reservas: BE-004.
- Route Handlers BFF y sustitución del mock Web: BE-005.
- CRUD de Staff, propiedades, roles o memberships: tarea de administración
  posterior con auditoría y revocación de sesiones.
