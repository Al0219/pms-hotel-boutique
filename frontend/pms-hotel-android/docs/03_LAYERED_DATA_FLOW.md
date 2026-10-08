# 03 — Layered Data Flow Android

```text
Fixture/mock local o API real posterior
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

Durante frontend-first, la fuente local debe respetar esta misma frontera. La política de contratos, datasets y sustitución futura está en `07_MOCK_AND_DATA_POLICY.md`.

Los services/remote retornan DTOs. Los mappers validan los campos obligatorios y no inventan defaults de negocio. Un estado o componente UI solo recibe modelos de dominio o estados derivados de ellos.
