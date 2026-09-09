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

## Capas mínimas
- Remote/API
- DTO
- Mapper
- Domain
- State Holder/ViewModel
- UI

## Principio
Mismo patrón conceptual que Web.

## No hacer
- UI con JSON crudo;
- DTO como ViewModel;
- network call directo desde componente React Native;
- business rule duplicada sin necesidad.

## Navegación
Separada de domain.
