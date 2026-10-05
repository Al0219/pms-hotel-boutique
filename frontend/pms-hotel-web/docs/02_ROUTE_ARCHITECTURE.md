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

### Public
Header + main + Footer.

### Private
Sidebar + StaffHeader + main.

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
