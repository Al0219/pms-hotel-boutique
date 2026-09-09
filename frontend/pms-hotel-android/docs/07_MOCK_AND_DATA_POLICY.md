# 07 — Mock and Data Policy Android

Mocks representan remote DTO.

El mock se conecta en la frontera Remote/API y conserva el recorrido Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI. No se inyectan modelos de dominio ni DTOs directamente en la UI.

Casos:
- success;
- null;
- empty;
- error;
- offline;
- retry.

Fixtures compatibles con Web/Backend.
