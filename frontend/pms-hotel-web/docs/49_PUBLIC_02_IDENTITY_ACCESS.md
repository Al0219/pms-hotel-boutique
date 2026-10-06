# Public 02 — Acceso y registro Guest

## Alcance autorizado

Refactorización frontend solicitada por José para WEB-2 / `IMP-WEB-0202`, ruta `/acceso`, en `feature/web2-public-identity-account`. Fuente visual: especificación del usuario; no se inventan Node IDs ni se declara comparación pixel-perfect con Figma sin una referencia visual.

El backlog conserva `IMP-WEB-0201` y `IMP-WEB-0202` PENDIENTE. El código de 0201 (GuestAccount/ExternalIdentity, service y mapper) ya existe y se reutiliza. La autorización del usuario cubre este incremento de presentación y prototipo local; no modifica el XLSX ni declara terminada la integración de autenticación real.

## Comportamiento del prototipo local (`NEXT_PUBLIC_USE_MOCK_API=true`)

- Encabezado exclusivo de `/acceso`: Hotel Boutique e inicio. Las otras rutas conservan navegación y acceso a cuenta de WEB-1.
- Tarjeta responsive con pestañas login/registro, operables con flechas, Home/End y teclado. Email se conserva al alternar; contraseñas se descartan.
- Login: correo y contraseña, mostrar/ocultar, Google, recuperación informativa y continuación como invitado.
- Registro: nombre, correo, contraseña y confirmación, indicador de fortaleza, aceptación explícita de términos/privacidad y marketing opcional. Ningún consentimiento viene marcado. La aceptación también se exige para el recorrido social de registro.
- Validación al salir del campo y enviar; después, errores se actualizan al editar. Primer campo inválido recibe foco. Indicador de fortaleza y mínimo de ocho caracteres son reglas de presentación, no una política de seguridad Backend confirmada.
- Envío bloqueado durante carga; errores de red/datos recuperables sin sesión falsa. Solo Crear cuenta muestra [Cuenta vinculada](50_PUBLIC_02_LINKED_ACCOUNT.md), con acciones explícitas para cuenta, reservas y checkout. Iniciar sesión con correo/Google redirige directamente al retorno autorizado o a `/cuenta`, sin confirmación intermedia ni demora artificial.
- Retornos mediante `guestAccessReturn`: solo `/mis-reservas`, `/cuenta/reservas/vincular` y `/reserva/checkout?...`. No se admite una URL externa ni se pone información del huésped en la URL.
- Se conserva el carrito y borrador de reserva mediante los providers existentes. La sesión Guest sigue separada de Staff; logout limpia exclusivamente caché Guest.

## Límite de autenticación y contrato local

La decisión `DEC-B-004` continúa rigiendo la autenticación **real**: cuenta Guest mediante Google OIDC. La especificación del usuario añade credenciales al **frontend**; Apple queda excluido por la corrección solicitada el 2026-10-06. Este incremento prepara sus interacciones locales; no cambia el backend, proveedores externos aprobados, permisos, BFF, cookies o JWT. BD1 debe acordar esos métodos antes de conectarlos.

El transporte del prototipo local sigue siendo exclusivamente MSW: `POST http://pms.test/__mock/guest-access`. No es un endpoint Backend confirmado. Entradas del prototipo:

```ts
type GuestAccessInput =
  | { method: 'EMAIL'; email: string; registration?: { fullName: string } }
  | { method: 'GOOGLE' };
```

Las contraseñas y su confirmación permanecen únicamente en los inputs transitorios. Nunca se envían a este transporte, guardan en query cache, sesión, storage, logs o fixtures. El prototipo **no verifica credenciales reales**. No implementa unicidad de correo, verificación de email ni recuperación por correo.

`GuestAccountDTO`, su mapper y los proveedores externos canónicos permanecen intactos. `accessMethod` es metadato de presentación en memoria. El acceso social usa únicamente Google y conserva su fixture y sus reglas de vinculación.

El registro local usa `guest-demo-register`, empieza sin reservas y aplica el nombre a su fixture **GuestProfile**, nunca a GuestAccount. Nombre y apellido son obligatorios en el mapper GuestProfile existente; el formulario solicita ambos dentro de Nombre completo para no producir un perfil inválido. El acceso posterior con el mismo correo conserva ese perfil mientras la aplicación siga abierta. El checkbox de marketing es presentación local: no afirma registrar un consentimiento real o suscribir un correo. Las políticas del hotel siguen pendientes de publicación y se muestran como tales en sus diálogos.

Tras la integración de BD1 en `main` el 2026-10-06, `NEXT_PUBLIC_USE_MOCK_API=false` utiliza la sesión Guest y el acceso Google reales mediante el BFF existente. No ofrece formularios locales de correo/registro ni Apple. Se conserva la comprobación de sesión, el logout real y el resumen de cuenta integrado, sin modificar sus contratos. El servicio de acceso simulado mantiene su guard independiente. La recarga completa termina únicamente la sesión local del prototipo en memoria. Véase [integración de cuenta](33_PUBLIC_ACCOUNT_FRONTEND.md).

## Verificación manual en puerto 3000

1. Abrir `/acceso`: encabezado limpio, pestaña Iniciar sesión activa y posibilidad de continuar como invitado.
2. Enviar vacío y corregir email/contraseña: errores contextualizados y foco; mostrar/ocultar contraseña.
3. Abrir Crear cuenta: verificar fuerza, coincidencia y términos obligatorios; marketing desmarcado y opcional.
4. Enviar los campos válidos: carga, check y retorno a Mis reservas. El nuevo registro no contiene reservas ajenas.
5. Google: estado de sesión local, sin requests a Backend. Vinculación local por sesión Guest, referencia y código según [entrega 51](51_PUBLIC_02_EXISTING_RESERVATION_LINK.md); la política Backend real se conserva. Apple no aparece en login ni registro.
6. `error@example.com` / `offline@example.com`: error recuperable sin redirección ni sesión; corregir email y reintentar.
7. Desde datos del huésped, acceder y regresar: mismos parámetros de búsqueda y borrador conservado.
8. Recuperación y enlaces legales: diálogos con Escape, foco devuelto y sin afirmar envío de correos.
9. Revisar teclado, tamaños 320–1440 px, contraste, cierre de sesión y ausencia de overflow.

La revisión WEB-1 y comparación con Figma siguen siendo requisitos de cierre formal. La conexión real de Google y los acuerdos con BD1 para los nuevos métodos quedan fuera de este incremento.

## Evidencia de validación — 2026-10-05

- Node 24 en Windows; CI Web utiliza Node 24 en Ubuntu. No se modifica su workflow.
- `npm run lint`: PASS, cero warnings.
- `npm run typecheck`: PASS, ejecutado después del build para evitar concurrencia sobre los tipos generados por Next. No se depende del `ignoreBuildErrors` existente.
- `NEXT_PUBLIC_USE_MOCK_API=true npm run build`: PASS, 70 rutas. Las modificaciones generadas de `next-env.d.ts` se retiran del diff.
- `npm run test -- --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 213 archivos / 1,009 pruebas; ninguna exclusión ni prueba deshabilitada.
- Pruebas finales del componente de acceso: PASS, 20 casos, incluida la validación de nombre/apellido y el acceso posterior al registro. La ejecución con un solo worker evita la saturación local; no cambia los tests ni el workflow.
- Chrome en `localhost:3000`: PASS para login, registro, Google/Apple locales, recuperación de error y retorno seguro al checkout; sin excepciones ni errores de consola. Sin requests al BFF de autenticación/Backend ni envío de contraseñas.
- Responsive: PASS a 320, 390, 540, 768, 1024 y 1440 px, incluido correo largo en el estado de éxito móvil.
- `git diff --check` y revisión del diff staged: PASS. Sin logs, parches, archivos de entorno ni capturas en el commit.

## Corrección — 2026-10-06

- Se retira Apple de login, registro, recuperación y fixtures locales. Google, correo y checkout como invitado se conservan.
- La prueba de Apple se reemplaza por la comprobación de su ausencia en ambas pestañas y la presencia de Google.
- `npm run test -- src/modules/auth/components/guest-access-page.test.tsx src/modules/auth/service/guest-access.service.test.ts src/modules/account --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 8 archivos / 53 pruebas. La primera ejecución concurrente con build/lint agotó el límite de 5 segundos de una prueba de vinculación; la repetición sin otras validaciones en paralelo pasó, sin alterar límites ni assertions.
- `npm run lint`, `npm run build`, `npm run typecheck` (tras build) y `git diff --check`: PASS. Se descarta el cambio generado de `next-env.d.ts`.
- Chrome sobre el servidor de desarrollo en `localhost:3000`: PASS para ausencia de Apple en login/registro, Google, formularios, errores recuperables y retorno al checkout. Responsive sin overflow a 320–1440 px; sin errores de consola, requests de autenticación al Backend ni transporte de contraseñas. Servidor iniciado con `NEXT_PUBLIC_USE_MOCK_API=true`; no se valida autenticación real.

## Resolución preparada frente a `origin/main` — 2026-10-06

Validación temporal frente a `ea3ac86`, sin modificar la rama publicada. Se combinan los cambios de BD1 en cuenta/sesión real con la eliminación de Apple; se conserva el correo único en la cuenta y el guard de identidades opcionales. Los dos conflictos corresponden a `account-dashboard-page.tsx` y `guest-access-page.test.tsx`.

- `npm run test -- src/modules/auth src/modules/account src/app/api/auth --pool=threads --maxWorkers=1 --reporter=dot`: PASS, 19 archivos / 166 pruebas, incluidos sesión real y BFF.
- `npm run lint`, `NEXT_PUBLIC_USE_MOCK_API=true npm run build`, `npm run typecheck` tras build: PASS.
- Sin marcadores de conflicto; diff contra `origin/main` limitado a los ocho archivos de la eliminación de Apple. No se modifican contratos ni código Backend.
