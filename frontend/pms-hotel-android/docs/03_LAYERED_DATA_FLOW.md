# 03 — Layered Data Flow Android

```text
Backend
  ↓
Remote Service
  ↓
DTO
  ↓
Mapper
  ↓
Domain
  ↓
State Holder / ViewModel
  ↓
UI
```

DTO refleja red.
Mapper puro.
Domain limpio.
UI no conoce detalles externos.

Los services/remote retornan DTOs. Los mappers validan los campos obligatorios y no inventan defaults de negocio. Un estado o componente UI solo recibe modelos de dominio o estados derivados de ellos.
