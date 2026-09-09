# Android Implementation Handoff

Before Android implementation, ANDROID-1 must:

1. Aplicar el stack aprobado en `DEC-A-001`: React Native, Expo, TypeScript, Expo Router, TanStack Query, `fetch`, Jest, React Native Testing Library y `StyleSheet` con tokens.
2. Crear el proyecto Expo con CNG dentro de `frontend/pms-hotel-android`, sin un repositorio Git anidado. `android/` e `ios/` quedan ignorados y no se versionan. La versión Expo seleccionada define las versiones nativas compatibles.
3. Establecer `Remote/API -> DTO -> Mapper -> Domain -> State/ViewModel -> UI`.
4. Crear la navegación técnica, tokens, mocks DTO remotos y la base de testing conforme a las tareas `IMP-AND-0002` a `IMP-AND-0008`.
5. Cerrar `IMP-AND-0009` antes de iniciar pantallas funcionales.

La Foundation se valida con `npm ci`, `npx expo-doctor`, `npx tsc --noEmit`, `npx expo export` y un smoke de navegación/app técnica. `npx expo run:android` puede utilizarse para validación local cuando exista SDK/emulador; no obliga a versionar el proyecto generado.

La fuente Figma canónica es `238:132 — Implementation Ready — Android V2 + V3`. La sección `31:132` es referencia histórica. El Structure Freeze y Sprint 0 no implementan pantallas funcionales.
