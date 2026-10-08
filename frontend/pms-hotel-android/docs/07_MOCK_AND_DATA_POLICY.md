# 07 — Mock and Data Policy Android

## Política canónica frontend-first

Android debe poder desarrollarse y ejecutarse sin Backend, endpoints, base de datos, auth servidor ni internet real. La ausencia de Backend no bloquea por sí sola una feature Android: el gate es autoridad visual/funcional suficiente y un contrato frontend/mock aprobado para el módulo. Esta política operacionaliza `DEC-G-013`.

El contrato frontend/mock define solo los datos, escenarios de UI y boundaries necesarios para la tarea. No es una API Backend y no fija endpoints, HTTP, persistencia, entidades, IDs Backend, esquema de datos, auth, permisos ni reglas Backend. La falta de Figma, campos, comportamiento, navegación, semántica mínima o pruebas sigue siendo un bloqueo real.

## Flujo obligatorio

```text
data/mocks/<módulo>
  ↓
Mock boundary / Remote Service
  ↓
Fixture DTO
  ↓
Mapper puro
  ↓
Domain
  ↓
TanStack Query/Mutation cuando corresponda
  ↓
RemoteState derivado
  ↓
UI
```

La UI no importa JSON, fixtures ni DTOs. Los mocks se conectan en la frontera Remote/API y no inyectan modelos de dominio directamente en la UI. TanStack Query es la autoridad de server-like state; `RemoteState` es una representación derivada, no un store paralelo.

## Ubicación de datos dummy

Para nuevas features, los datasets dummy/locales viven bajo `src/data/mocks/<módulo>/`. `src/data/mocks/MockTransport.ts` continúa como infraestructura técnica transversal; la implementación mock sustituible de cada módulo puede residir en el módulo, pero consume datasets desde la capa `src/data/mocks`.

Stay y Services ya poseen fixtures locales dentro de `src/modules/<módulo>/data/mocks/`. Se conservan para evitar churn. La migración será gradual, solo cuando una tarea autorizada cambie materialmente ese dataset: se moverá una única fuente de verdad, se actualizarán sus imports y pruebas en el mismo cambio, sin duplicar fixtures.

## Modos y escenarios

El modo actual es `MOCK / LOCAL DATA`; `.env.example` parte de `EXPO_PUBLIC_USE_MOCK_API=true`. Una feature puede simular determinísticamente, cuando sus Acceptance Criteria lo requieran: loading, data/success, error, offline mediante `NetworkError`, mutation pending, mutation success y mutation error. No se exige un estado que Figma o el backlog no pidan.

`EXPO_PUBLIC_USE_MOCK_API` y `EXPO_PUBLIC_API_BASE_URL` son configuración pública. Está prohibido almacenar secretos, tokens, claves o credenciales en cualquier variable `EXPO_PUBLIC_*`.

## Sustitución futura

Cuando Backend se integre, una implementación API reemplazará la implementación mock. Sus DTOs reales pueden diferir de los fixture DTOs; DTO/Mapper absorben esa diferencia sin convertir fixtures en contrato API. Domain, UI, hooks públicos y query keys se conservan cuando sea razonable.
