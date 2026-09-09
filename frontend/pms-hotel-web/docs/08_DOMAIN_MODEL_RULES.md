# 08 — Domain Model Rules

## Objetivo
Modelo estable y seguro para UI.

## MUST
- nombres del lenguaje del negocio;
- tipos seguros;
- enums/union types cuando aporten;
- separar amount/currency;
- separar IDs.

## MUST NOT
- campos con nombres de API externa;
- snake_case solo porque backend lo usa;
- strings formateados de dinero como fuente de verdad;
- lógica React.

## Ejemplo Payment

```ts
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerReference?: string;
  last4?: string;
}
```

No incluir PAN/CVV.
