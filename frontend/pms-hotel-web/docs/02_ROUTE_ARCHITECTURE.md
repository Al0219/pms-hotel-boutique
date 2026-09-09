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
