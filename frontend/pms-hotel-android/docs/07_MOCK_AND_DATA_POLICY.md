# 07 — Mock and Data Policy Android

Mocks representan remote DTO.

El mock se conecta en la frontera Remote/API y conserva el recorrido Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI. No se inyectan modelos de dominio ni DTOs directamente en la UI.

`EXPO_PUBLIC_USE_MOCK_API` y `EXPO_PUBLIC_API_BASE_URL` son configuración pública. Está prohibido almacenar secretos, tokens, claves o credenciales en cualquier variable `EXPO_PUBLIC_*`.

Casos:
- success;
- null;
- empty;
- error;
- offline;
- retry.

Fixtures compatibles con Web/Backend.
