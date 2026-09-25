# IMP-WEB-0202 — Corrección de acceso y sesión Guest frontend

Fecha: 2026-09-23. Owner: WEB-2. Reviewer del backlog: WEB-1.
Fuente: Public 02 Identidad y cuenta. No se agregan Node IDs.

## Autorización y dependencias

El usuario autorizó expresamente corregir el acceso Guest simulado y unificar la autoridad de sesión (puntos 13 y 14). Se reutiliza GuestAccount/ExternalIdentity de IMP-WEB-0201 y el resumen de Account existente. El XLSX mantiene 0201 y 0202 PENDIENTE; esta corrección no altera estados ni declara la dependencia formalmente COMPLETADA. El cierre requiere reconciliar el backlog, revisión WEB-1 y QA visual contra Figma.

## Contrato frontend de simulación

Este contrato describe exclusivamente la demostración local. No confirma una API Backend, permisos, OAuth, envío de correos, JWT ni autenticación real.

- Transporte MSW exclusivo de desarrollo: POST `http://pms.test/__mock/guest-access`.
- Entrada: `{ method: "EMAIL", email: string }` o `{ method: "GOOGLE" }`.
- Respuesta: GuestAccountDTO existente, convertido a GuestAccount por su mapper.
- Cuenta ficticia de demostración: `guest-demo-01`. Un correo válido selecciona esa cuenta demo y se refleja en la sesión; no busca cuentas reales ni crea un GuestProfile.
- Google devuelve la misma cuenta demo con ExternalIdentity GOOGLE; no contacta al proveedor.
- `error@example.com`: error recuperable 503. `offline@example.com`: error de red simulado. El resto de correos válidos produce éxito con una demora de 400 ms.
- Con mocks desactivados el service rechaza el acceso simulado antes de hacer red.
- El resumen usa el service/DTO/mapper Account existentes con un fixture MSW para la cuenta demo. El correo y método de acceso visibles proceden siempre de la sesión Guest, no del resumen.

## Autoridad y ciclo de vida

GuestSessionProvider se monta una sola vez bajo el QueryClientProvider raíz. Expone cuenta Domain, estado derivado signed-in/signed-out, signIn/signOut y estado de la mutación. Los formularios solo mantienen estado de presentación.

No se guardan credenciales, tokens ni sesión en localStorage/sessionStorage. La navegación cliente conserva la sesión. Una recarga completa o una pestaña nueva empieza signed-out. La autorización real de datos deberá implementarse en Backend en su fase.

Solo una respuesta válida puede iniciar sesión. La mutación rechaza doble envío; cerrar sesión aborta solicitudes pendientes, retira la cuenta y cancela/elimina las queries con prefijo `guest`. No toca queries Staff ni operativas.

`/cuenta/*` comparte GuestAccountGate: sin sesión no monta el contenido de cuenta y ofrece `/acceso` y `/`. No usa el historial del navegador como destino de invitado. La cuenta muestra el resumen obtenido por capas y ofrece cerrar sesión.

El acceso simula directamente la verificación: no afirma haber enviado o validado un enlace real. El éxito ofrece `Ir a mi cuenta` y `Continuar reservando`. No declara reservas vinculadas por pulsar un botón ni una recuperación real que no existe.

## Prueba manual

1. Activar `NEXT_PUBLIC_USE_MOCK_API=true` en el entorno local y reiniciar dev.
2. Entrar directamente a `/cuenta` y `/cuenta/perfil`: contenido oculto, acceso disponible.
3. En `/acceso`, correo válido: comprobar carga, envío bloqueado, éxito y CTA a Cuenta.
4. Navegar a Cuenta y Perfil: mismo correo y sesión. Cerrar sesión: contenido Guest retirado.
5. Probar `error@example.com`: error sin éxito; corregir el correo y reintentar.
6. Probar `offline@example.com`: mensaje de conectividad, borrador conservado.
7. Google opcional: retorno simulado, Cuenta muestra Google conectado. Correo no muestra Google conectado.
8. Continuar invitado: lleva a `/` y permite seguir sin sesión.
9. Recargar: vuelve a signed-out conforme al ciclo de vida en memoria.
10. Revisar teclado, labels, foco, responsive y comparación Figma antes de cerrar QA.

## Límites del alcance

No implementa los flujos restantes de Profile/Rewards/Promotions/Privacy/Security/Multi-property. Las páginas hijas existentes comparten el gate, pero su migración de datos corresponde a sus siguientes tareas. No se crea una sesión Staff demo inexistente ni se habilitan permisos por iniciar sesión Guest.

## Evidencia técnica — 2026-09-23

- `npm run lint`: PASS, cero warnings.
- `npm run typecheck`: PASS.
- `npm run test -- --maxWorkers=2`: PASS, 14 archivos / 50 pruebas en el árbol final.
- `npm run build`: PASS; rutas `/acceso`, `/cuenta` y sus hijas generadas.
- `git diff --check`: PASS.
- Casos automatizados: correo, carga, error y recuperación, fallo de red, Google opcional, doble submit, datos de cuenta inválidos, validación de email, ayuda por teclado, sesión entre montajes de páginas, guard de Cuenta/Perfil, logout y separación de caché Staff; arranque de mocks y retry.
- Se regeneraron tipos locales de Next porque la caché de desarrollo conservaba rutas de otra rama. No se cambiaron rutas WEB-3 ni su código.
- Pendiente: recorrido en navegador, comparación visual contra Figma y revisión WEB-1. No se declara DoD visual PASS ni se modifica el XLSX.

## Corrección de configuración del navegador

Se detectó que `getPublicEnvironment(environment = process.env)` funcionaba en Node pero impedía que Next incorporara las variables públicas al bundle del navegador. Como resultado, el service rechazaba todos los accesos con `GUEST_MOCK_ACCESS_DISABLED`, presentado como error genérico.

Se sustituyó el alias por accesos directos a `process.env.NEXT_PUBLIC_USE_MOCK_API` y `process.env.NEXT_PUBLIC_API_BASE_URL`. Se verificó el build con mocks activados y se ejecutó la función extraída del chunk cliente en un contexto JavaScript sin `process`: devolvió `useMockApi: true` y la URL configurada. Esta comprobación cubre la diferencia de compilación que las pruebas en Node no detectaban.

Build y lint PASS. Para probar localmente después del cambio: reiniciar `npm run dev` y recargar `/acceso` con Ctrl+Shift+R; no cambiar las variables existentes.
