# 04 — Layered Data Flow

## Pipeline

```text
Backend/API
   ↓
Service
   ↓
DTO
   ↓
Mapper
   ↓
Domain Model
   ↓
Hook/State
   ↓
UI
```

## Ejemplo PMS

### DTO provisional

```ts
export interface ReservationDTO {
  reservation_id: string;
  guest_name: string | null;
  total_amount: string;
  check_out_date: string | null;
  status_code: string;
}
```

### Domain

```ts
export interface Reservation {
  id: string;
  guestName: string;
  totalAmount: number;
  checkOutDate: Date | null;
  status: ReservationStatus;
}
```

### Mapper

```ts
export function mapReservation(dto: ReservationDTO): Reservation {
  return {
    id: dto.reservation_id,
    guestName: dto.guest_name?.trim() ?? "Sin nombre",
    totalAmount: Number(dto.total_amount),
    checkOutDate: dto.check_out_date ? new Date(dto.check_out_date) : null,
    status: mapReservationStatus(dto.status_code),
  };
}
```

### Service

```ts
export async function getReservation(id: string): Promise<ReservationDTO> {
  const response = await fetch(`/api/reservations/${id}`);
  if (!response.ok) throw new Error("RESERVATION_REQUEST_FAILED");
  return response.json();
}
```

## Prohibido

```text
Component -> fetch
Component -> DTO
Service -> Domain
Mapper -> HTTP
Mapper -> JSX
```
