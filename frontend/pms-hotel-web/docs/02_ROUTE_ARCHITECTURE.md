# 02 — Route Architecture

## Requisito
Route Groups obligatorios:

```text
src/app/
├── (public)/
└── (private)/
```

## Importante
Los paréntesis no forman parte de la URL.

### Correcto
`src/app/(public)/habitaciones/page.tsx`
-> `/habitaciones`

`src/app/(private)/reservas/page.tsx`
-> `/reservas`

## Conflicto
No crear:

```text
(public)/page.tsx
(private)/page.tsx
```

si ambos resuelven `/`.

## Home pública
`(public)/page.tsx` -> `/`

## Entrada privada
Preferir:
`(private)/dashboard/page.tsx` -> `/dashboard`

## Habitaciones: decisión aprobada el 2026-10-04

Por confirmación explícita de José:
- `(public)/habitaciones/page.tsx` -> `/habitaciones`: búsqueda y resultados Guest.
- `(private)/staff/habitaciones/page.tsx` -> `/staff/habitaciones`: tablero Staff.

El menú Staff usa la segunda URL. La ruta pública no se redirige al tablero
Staff ni exige su sesión. El tablero conserva su layout privado y reglas de acceso.

## Layouts

### Vinculación de reserva Guest — 2026-10-06

Vista frontend solicitada por José: `(public)/cuenta/reservas/vincular/page.tsx` → `/cuenta/reservas/vincular`. Segmento estático junto al detalle dinámico `[reservationId]`; no representa un ID comercial de reserva. Reutiliza el guard Guest del layout de cuenta, conserva el destino al iniciar sesión y no crea endpoints Backend.

### Public
Header + main + Footer.

### Private
Sidebar + main. La identidad Staff, el rol, el selector de propiedad y el logout
se concentran en el sidebar compartido; no hay StaffHeader horizontal
(decisión de presentación autorizada, 2026-10-08). El menú conserva labels e
iconos y se despliega en pantallas estrechas.

## BFF Staff Admin — Fase 2B (2026-10-22), EN_QA

GET /api/staff/admin/roles, /users y /users/[id] son fachadas reales de Spring
/api/v1/staff-admin/*. Cookie Staff existente, STAFF_MANAGE/scope efectivos en
Backend, proyección allowlist y no-store; métodos no admitidos dan 405. No crea
páginas /seguridad/usuarios ni modifica el shell. [Contrato/QA 64](64_STAFF_ADMIN_BFF_QA.md).

## page.tsx

Debe ser delgado.

Ejemplo:

```tsx
import { ReservationCenterPage } from "@/modules/reservations";

export default function Page() {
  return <ReservationCenterPage />;
}
```

## MUST NOT
- fetch;
- DTO mapping;
- lógica de negocio pesada;
- duplicate layout.

## Administración Staff — Fase 2C (cierre preparado)

/seguridad/usuarios y /seguridad/usuarios/[staffUserId] componen la API pública
de src/modules/staff dentro de StaffShell; STAFF_MANAGE, PropertyProvider y BFF
real existente. Listado de tres columnas agrupadas (Usuario, Acceso y Asignación), filtros/cursor y detalle
solo lectura. Sin SecurityFrame adicional ni mutaciones. Evidencia y QA manual:
[65_STAFF_ADMIN_UI_QA.md](65_STAFF_ADMIN_UI_QA.md). Backend/BFF conservan EN_QA.

Corrección UX autorizada (EN_QA): el detalle principal es ahora una fila expandible
en /seguridad/usuarios con GET bajo demanda. La URL antigua /[staffUserId]
redirige al listado protegido conservando solo filtros; no consulta el target.
Guard Staff existente configurado hacia /acceso sin sesión y sin contenido
administrativo durante revalidación. Historial/manual QA en Web65.

Última conformidad condicionada del usuario satisfecha: Acciones retirada,
chevron dentro de Usuario, detalle colspan3 y regresiones PASS. No se atribuye
una nueva inspección manual de esta tabla; salvedades y evidencia en Web65.
Backend2A/BFF2B mantienen EN_QA independiente.
