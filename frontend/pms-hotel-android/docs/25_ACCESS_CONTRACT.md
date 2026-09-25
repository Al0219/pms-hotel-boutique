# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0108

## Acceder a una estadía

**Tarea:** `IMP-AND-0108 — MOB-19 — Access / Vincular reserva`
**Estado del contrato:** `APPROVED`
**Autoridad visual:** `1841:410 — APPROVED FOR IMPLEMENTATION — IMP-AND-0108 — Access states`.

| Estado | Frame |
| --- | --- |
| Base | `1841:411` |
| Validación local | `1841:431` |
| Submitting | `1841:453` |
| Datos no coincidentes | `1841:476` |
| Error genérico | `1841:496` |
| Offline | `1841:516` |

`31:133 — MOB-01 — Access reservation` es referencia histórica únicamente.

## Campos y validación

`ReservationAccessRequest` representa únicamente:

- `reservationCode: string`;
- `email: string`.

Ambos campos son requeridos y se recortan para validación. El correo debe tener formato email válido. No se define regex ni longitud para el código. La mutation no se ejecuta hasta que ambos campos sean localmente válidos.

El mock puede comparar ambos valores sin distinguir mayúsculas/minúsculas después de trim, sin alterar el valor visible al huésped. El fixture aprobado puede usar `HB-2026-004281` y `ana@example.com`; no es contrato Backend.

No se agregan apellido, nombre, habitación, PIN, fechas, contraseña ni teléfono.

## Boundary frontend-first

```text
access reservation fixture
  ↓
MockAccessService
  ↓
DTO remote-shaped, solo si existe transformación real
  ↓
mapper puro, solo si corresponde
  ↓
ReservationAccessResult
  ↓
useLinkReservation / TanStack Query mutation
  ↓
AccessScreen
```

La UI no consume fixture ni compara datos contra él. La comparación pertenece a `MockAccessService`. `ReservationAccessResult` representa solo una vinculación mock exitosa; puede contener un identificador de reserva únicamente si hace falta para separar boundary y dominio. No contiene token, sesión, perfil ni `ReservationStay` completo.

`ReservationStayDto`, `currentStayFixture` y `MockStayService` no son credenciales y no se reutilizan para Access. `/account` es el único elemento reutilizado como destino post-success.

## Errores y estados

- Validación local: no llama al service.
- Datos no coincidentes: `ReservationNotFoundError` puede existir internamente como error de negocio mock si código y correo no coinciden con fixture; no es `NetworkError`. La UI no expone “reserva no encontrada”, correo inexistente ni cuál dato falló. Muestra exclusivamente **“No pudimos verificar los datos”** y **“Revisa el código de reserva y el correo e inténtalo de nuevo.”**.
- Error genérico: fallo inesperado del boundary mock.
- Offline: `NetworkError` existente.

Las validaciones locales required/formato sí pueden ser específicas porque no consultan datos remotos. Datos no coincidentes, Error y Offline conservan ambos campos; datos no coincidentes permite corrección y reenvío, y Error/Offline permiten retry manual. Submitting bloquea envíos duplicados. No existe Empty.

### Resolución QA-AND-0108

El estado visual de `1841:476` se conserva, pero la decisión QA/producto sustituye su copy user-facing por el copy genérico anterior para evitar enumeración. Figma deberá sincronizar ese copy antes del cierre final. QA-AND-0108-01 se resuelve con `KeyboardAvoidingView` (`height` en Android), `ScrollView` desplazable y scroll al foco derivado del layout, sin offsets fijos ni librerías nuevas.

## Routing y límites

La semántica de este flujo es acceso temporal a una estadía concreta mediante reserva + correo; no es autenticación principal de cuenta. `IMP-AND-0501` define la foundation session-only de `ActiveReservationContext`, pero no altera este contract runtime: Access no crea `GuestAuthSession` ni añade una reserva a la cuenta. Solo `IMP-AND-0503`, con contrato y pruebas propios, podrá resolver un contexto temporal después de un éxito.

En esta fase frontend/mock, `/` dirige a `/access`. `/access` está fuera de `GuestNavigationShell`, no muestra footbar ni tabs. Un éxito de mutation ejecuta `router.replace('/account')`; no existe modal, toast obligatorio, pantalla de success ni spinner adicional post-success.

No se implementan auth real, tokens, cookies, AsyncStorage, SecureStore, persistencia de guest linked, Backend, HTTP real, Firebase ni sesión. Un cold start puede volver a `/access`. El deep link directo a `/account` no queda prohibido por este contrato.
