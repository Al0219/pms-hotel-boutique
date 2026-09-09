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
