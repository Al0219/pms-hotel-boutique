# 02 — Android Architecture

## Stack aprobado
- React Native + Expo;
- TypeScript;
- Expo Router;
- TanStack Query para server state;
- `fetch` nativo para HTTP;
- React Native `StyleSheet` y design tokens;
- Jest + React Native Testing Library.

Expo SecureStore se incorpora al existir autenticación real. NetInfo se incorpora al implementar offline/recovery. Android Studio se usa para emulador y depuración, no como arquitectura de UI.

No usar Redux, Zustand, framework de DI, Compose ni XML en Sprint 0.

## Native Generation
Expo usa Continuous Native Generation (CNG). `android/` e `ios/` son artefactos generados, quedan ignorados por Git y no constituyen fuente de verdad. Si se necesita un proyecto nativo local, se genera con `npx expo prebuild` o `npx expo run:android`.

La validación Foundation usa `npm ci`, `npx expo-doctor`, `npx tsc --noEmit`, `npx expo export` y un smoke de navegación/app técnica. `Gradle build/assemble` no es requisito de CI ni de la tarea Foundation.

## Capas mínimas
- Remote/API
- DTO
- Mapper
- Domain
- State Holder/ViewModel
- UI

## Ejecución frontend-first

En la fase actual, la fuente Remote/API puede ser una implementación mock con datos dummy/locales; Backend real no es un prerrequisito de una feature Android. La política operativa y la ubicación canónica de los datasets se definen únicamente en `07_MOCK_AND_DATA_POLICY.md`.

Una integración posterior sustituye la implementación mock por una implementación API. DTO/Mapper absorben la forma externa real sin exponer DTOs a UI ni rediseñar Domain, UI, hooks públicos o query keys cuando sea razonable.

## Principio
Mismo patrón conceptual que Web.

## No hacer
- UI con JSON crudo;
- DTO como ViewModel;
- network call directo desde componente React Native;
- business rule duplicada sin necesidad.

## Navegación
Separada de domain.
