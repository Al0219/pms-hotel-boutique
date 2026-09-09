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
Hook / State
   ↓
UI
```

## DTO provisional

```ts
export interface ReservationDTO {
  reservation_id: string;
  guest_name: string | null;
  total_amount: string;
  check_out_date: string | null;
  status_code: string;
}
```

## Domain

```ts
export interface Reservation {
  id: string;
  guestName: string | null;
  totalAmount: number;
  checkOutDate: Date | null;
  status: ReservationStatus;
}
```

## Mapper
Un campo opcional puede normalizarse cuando la regla lo permita. Un campo obligatorio inválido NO recibe un default de negocio.

```ts
export function mapReservation(dto: ReservationDTO): Reservation {
  const amount = Number(dto.total_amount);

  if (!Number.isFinite(amount)) {
    throw new DomainMappingError("INVALID_RESERVATION_AMOUNT");
  }

  return {
    id: dto.reservation_id,
    guestName: dto.guest_name?.trim() || null,
    totalAmount: amount,
    checkOutDate: dto.check_out_date ? new Date(dto.check_out_date) : null,
    status: mapReservationStatus(dto.status_code),
  };
}
```

## Service
El Service usa el cliente técnico común y retorna DTO; no retorna Domain.

```ts
export async function getReservation(id: string): Promise<ReservationDTO> {
  return httpClient.get<ReservationDTO>(`/reservations/${id}`);
}
```

El endpoint anterior es solo ejemplo de forma arquitectónica, no contrato API confirmado.

## Prohibido

```text
Component -> fetch
Component -> DTO
Service -> Domain
Mapper -> HTTP
Mapper -> React/Router/Storage/DOM
```
