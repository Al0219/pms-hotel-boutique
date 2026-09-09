# PMS Hotel Boutique — Android AGENTS

Leer primero AGENTS/docs globales y el backlog canónico:

`../../docs/Backlog_Implementacion_PMS_V1.xlsx`

Luego leer docs Android según la tarea.

## Arquitectura
Remote/API -> DTO -> Mapper -> Domain -> State Holder/ViewModel -> UI.

UI no consume DTO crudo ni hace red directa.

## Cross-app
No inventar statuses/contracts incompatibles con Web/Backend.

## Backlog
ANDROID-1 toma únicamente la siguiente tarea Android READY autorizada. Reviewer Web depende del dominio afectado.
