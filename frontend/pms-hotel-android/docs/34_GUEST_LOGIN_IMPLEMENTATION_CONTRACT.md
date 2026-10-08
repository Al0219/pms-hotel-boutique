# 34 — Guest Login implementation contract

**Tarea:** `IMP-AND-0502 — Guest Login`
**Estado:** `EN_QA` — validación automática completada; pendiente QA manual y revisión final
**Owner:** `ANDROID-1`
**Reviewer:** `WEB-2`
**Autoridad visual:** frontend-first aprobada; sin frame Figma bloqueante.

## Ruta y límite de navegación

`/` redirige a `/login`. `/login` está fuera de `GuestNavigationShell`: no presenta footbar, drawer ni Chat FAB. `/access` permanece como ruta externa y separada para acceder temporalmente a una estadía mediante código de reserva + email.

Login no crea `/reservations`, no agrega guards y no migra queries Stay. La selección de la reserva activa, sus guards y las invalidaciones reservation-scoped son responsabilidad exclusiva de `IMP-AND-0503`.

## Pantalla y estados

La pantalla usa tokens/componentes Android existentes, una composición mobile-first sobria y `KeyboardAvoidingView` + `ScrollView`. Muestra solamente:

```text
Hotel Boutique
Inicia sesión
Accede a tu cuenta para continuar.

Correo electrónico
Contraseña [icono de visibilidad]
Iniciar sesión
Acceder a una estadía
```

No incluye crear cuenta, registro, recuperación de contraseña, login social, biometría ni “recordarme”. Los únicos estados remotos son `SUBMITTING`, `INVALID_CREDENTIALS`, `ERROR` y `OFFLINE`; Base y validación local no son errores remotos.

## Validación y accesibilidad

- Correo obligatorio, trim y formato válido.
- Contraseña obligatoria, sin reglas de complejidad locales.
- La mutation no corre con errores locales.
- La contraseña inicia oculta. El control accesible alterna sus labels entre “Mostrar contraseña” y “Ocultar contraseña”. El icono Eye vive dentro del campo, al extremo derecho, conserva el mismo contorno/altura exterior que Correo electrónico y mantiene padding interno para no solapar texto.
- Correo electrónico inicia como valor vacío y usa solamente el placeholder neutro `nombre@correo.com`; nunca expone una credencial mock.
- Durante submit se bloquean campos, toggle, CTA principal y acción secundaria; un ref evita doble mutation.
- Errores locales/remotos usan texto y `accessibilityLiveRegion`; no se comunican solo por color.
- Al editar un campo se descarta el error remoto stale y se preserva el resto del formulario.

## Boundary frontend-first y seguridad

```text
GuestLoginRequest (estado local)
  → useGuestLogin / TanStack Mutation
  → GuestAuthService.login
  → GuestAuthSession
```

`MockGuestAuthService` es la implementación por defecto e inyectable para pruebas. La UI no consume fixtures, no hace fetch y no introduce token, refresh, cookie, OAuth, Firebase, AsyncStorage ni SecureStore.

Password existe solamente en el estado local y durante la llamada a `login`; el hook mantiene el request en un ref transitorio y muta sin variables para que no entre al estado/cache de TanStack. No se almacena en `GuestAuthSession`, `ActiveReservationContext`, params de navegación, query keys, logs ni storage. `InvalidGuestCredentialsError` se muestra con copy genérico y no enumera correo o contraseña.

## Handoff transitorio de 0502

Tras éxito Login:

1. recibe `GuestAuthSession`;
2. limpia cualquier `ActiveReservationContext` previo;
3. invoca `beginSession(session)`;
4. ejecuta `router.replace('/account')`.

Este es el **0502 transitional handoff**. No significa que `/account` sea context-aware ni permite elegir una reserva. `0503` lo reemplazará por `GuestAccount → LinkedReservations → EMPTY/AUTO_SELECT/REQUIRES_SELECTION → ActiveReservationContext → /account o /reservations`.

La CTA secundaria usa `router.push('/access')`, de modo que Android Back puede volver a Login. Access no recibe sesión, contraseña ni identidad de Login.

## Pruebas requeridas

Las pruebas cubren Base, validación local, placeholder neutral, input oculto y Eye toggle, trim, submit único/pending, credenciales inválidas, error/offline/retry, limpieza de error stale, inicio de sesión, limpieza de contexto, handoff temporal, navegación a Access y exclusiones de UI. Navegación cubre Logout fuera de los acordeones, confirmación/cancelación, limpieza de sesión/contexto/QueryClient y el flujo dirty → descarte → confirmación de Logout. Las pruebas de ruta comprueban `/ → /login`; Login y Access no presentan Logout.


## Resoluciones de QA manual

- **QA-AND-0502-01 — Password visibility:** el control textual lateral se sustituyó por un icono Eye interno de `expo-symbols`, centralizado en `guestFeatureIcons`. Oculto usa `visibility_off / eye.slash`; visible usa `visibility / eye`, sin alterar la accesibilidad independiente del input ni el target táctil del botón.
- **QA-AND-0502-02 — Email placeholder:** el campo vacío presenta `nombre@correo.com` como placeholder neutro; el estado sigue iniciando en cadena vacía y el ejemplo QA `guest@example.com` no forma parte de la UI.
- **QA-AND-0502-03 — Cerrar sesión:** el drawer Guest agrega la acción global final, visualmente separada de sus acordeones. Reutiliza `ConfirmationModal`; cancelar conserva drawer, sesión, contexto y cache. Confirmar cierra el drawer, ejecuta `clearActiveReservationContext()`, `clearSession()`, `queryClient.clear()` y `router.replace('/login')`, sin servicio/logout Backend, token ni persistencia.

Los providers locales del grupo `(guest)` (solicitudes de sesión, checkout, vehículos y notices) se reinician por unmount al salir a `/login`. `QueryProvider` reside en el root, por lo que su cache server-like se limpia explícitamente. Si una pantalla con hamburger tiene un `GuestNavigationGuard` dirty, Logout primero solicita el descarte existente y solo después presenta su confirmación; no hay bypass. Las pantallas focused que no presentan hamburger no exponen una ruta alternativa de Logout.

- **QA-AND-0502-04 — Footer de Logout:** el footer podía salir del viewport en Android. Header y footer ahora son fijos; las secciones viven en un `ScrollView` body con `flex: 1` y `minHeight: 0`. El panel permanece dentro de `SafeAreaView` con edge inferior, por lo que no usa márgenes dependientes de un dispositivo ni queda detrás de la gesture bar.
- **QA-AND-0502-05 — Back en Inicio:** Android Back en `/account` ya no retorna silenciosamente a Login: solicita el mismo `requestLogout` centralizado y confirma mediante el modal existente antes de ejecutar `performLogout`.
- **QA-AND-0502-06 — Back en raíces secundarias:** Android Back en `/services`, `/valet` o `/hotel` usa `router.replace('/account')`. Las rutas hijas conservan sus handlers/Back nativos aprobados.
