# 03 — Frontend Architecture

## Stack base
- Next.js
- React
- App Router
- TypeScript strict

## Estructura objetivo

```text
src/
├── app/
│   ├── (public)/
│   ├── (private)/
│   └── globals.css
├── modules/
├── shared/
├── data/
└── lib/
```

## Módulo

```text
modules/<domain>/
├── dtos/
├── mappers/
├── model/
├── service/
├── hooks/
├── components/
└── index.ts
```

No crear carpetas vacías solo por estética.

## Dominios
- auth
- account
- profile
- booking
- checkout
- reservations
- stays
- guests
- rooms
- availability
- rates
- inventory
- folio
- payments
- receivables
- housekeeping
- maintenance
- companies
- agencies
- groups
- rewards
- promotions
- revenue
- channels
- integrations
- reports
- privacy
- permissions
- security
- properties

## shared
Solo código genérico y reutilizable.

## lib
Infraestructura técnica.
Ejemplo: http client, env config.

## data
Mock network/fixtures.

## Dependency direction
app -> modules -> shared/lib

No cross-module internals.
