# 06 — DTO Rules

## Propósito
Representar contrato de red.

## MUST
- reflejar JSON real/provisional;
- mantener nulls permitidos;
- documentar campo opcional;
- sufijo DTO;
- separar request/response cuando difieren.

## MUST NOT
- nombres "bonitos" solo para UI;
- métodos React;
- formatting;
- defaults visuales.

## Provisional
Si backend no existe:

```ts
/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 */
export interface ...
```

## DTO vs Domain

Incorrecto:
DTO idéntico al Domain sin razón.

Correcto:
DTO representa API y Mapper absorbe diferencias.

## Null
No ocultar null si la red puede devolverlo.

## Money
Si API devuelve string:
DTO string.
Mapper convierte.

## Dates
DTO conserva string si así viene por HTTP.
