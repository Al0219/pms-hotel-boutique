# 08 — State and Offline Policy

Android debe cubrir especialmente:
- Loading
- Error
- Offline
- Recovery

Rewards/promotions ya tienen estados Figma específicos.

No mostrar stale data como confirmado sin indicador.

TanStack Query es el mecanismo de server state. NetInfo no se instala ni se usa hasta una tarea que implemente offline/recovery real; mientras tanto, los estados offline de Figma se modelan y prueban mediante errores de transporte simulados.

`RemoteState` es una representación técnica derivada de resultados de TanStack Query, no un store ni una segunda fuente de verdad.
