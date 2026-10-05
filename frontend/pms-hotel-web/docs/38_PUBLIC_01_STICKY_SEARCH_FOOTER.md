# Public 01 — Mis reservas, búsqueda flotante y footer

Fecha: 2026-10-04. Responsable: José / WEB-1. Fuente: correcciones explícitas
del usuario para Public 01, vinculadas a IMP-WEB-0101 y la navegación pública.
Autorización limitada a estas correcciones; no se modifica el XLSX ni se declara
cierre del recorrido WEB-1. Reviewer de sesión: WEB-2; disponibilidad: WEB-4.
El footer sustituye la primera versión documentada en 37_PUBLIC_01_REDESIGN.md.

## Navegación Guest

El header dirige Mis reservas a `/acceso` sin una GuestAccount activa y a
`/mis-reservas` con ella. Mi cuenta reemplaza Iniciar sesión cuando corresponde.
MyReservationsPage también redirige con replace al acceso si no hay cuenta:
sus tarjetas no se renderizan para visitantes ni después de cerrar sesión.
No altera Guest Auth, Staff Auth, cookies, endpoints ni contratos.

Límite existente: useGuestSession representa una sesión de demostración en
memoria. La restauración de sesión real vía BFF y la consulta de reservas
vinculadas al GuestAccount siguen siendo trabajo de integración. Este cambio
protege navegación/renderizado; la autorización de datos sigue en Backend.
Las tarjetas de Mis reservas siguen siendo ejemplos, no reservas consultadas.

## Búsqueda flotante

Una versión compacta fija abajo se activa cuando el buscador original ha
desaparecido por encima del viewport. No aparece si aún está abajo o visible.
IntersectionObserver se desconecta al desmontar; existe fallback scroll/resize.
Se muestra el borrador actual de fechas, huéspedes y habitaciones del formulario
original. Buscar envía ese formulario con la misma validación, promoción,
criterios en URL y bloqueo de doble envío. Modificar vuelve a fechas/ocupación
sin resetear datos y abre el panel Guest cuando corresponde.

Hay un único formulario y una autoridad de criterios; no se crean dos búsquedas
independientes. La barra oculta queda inert y aria-hidden. Las transiciones y el
scroll respetan reduced-motion; safe-area preserva el margen en móvil.
El footer reserva espacio para mantener la fila legal por encima de la barra.

## Footer editorial

Cuatro columnas en escritorio, dos en tablet y una en móvil: identidad/idioma y
moneda, Explorar, Contacto & Ubicación, Síguenos. Sub-footer con copyright y
Privacidad/Términos/Cookies. SVG propios, focos visibles y hover reducido cuando
lo solicita el usuario. No se añade newsletter, que era opcional y no tiene
contrato de suscripción ni consentimiento confirmado.

Contenido editable centralizado en
`src/modules/booking/content/public-hotel-content.ts`. Es configuración
editorial, no un mock de entidades ni un endpoint. Dirección/telefono/correo
ficticios explícitamente solicitados por el usuario y señalados en UI.
El teléfono usa el rango ficticio 202-555-01xx y el correo el dominio .example.
Las URLs sociales son configurables; mientras sean null abren una explicación
de demostración. Galería/Ofertas/FAQ abren información sin inventar rutas.
No se presentan políticas legales pendientes como documentos aprobados.

## Validación

Lint y typecheck: PASS. Regresión enfocada: 8 archivos / 79 pruebas PASS,
incluidas navegación Guest anónima/autenticada, redirección sin mostrar tarjetas,
contenido de footer, activación/desactivación del observer, criterios editados,
envío flotante, desconexión del observer y fechas inválidas en el resumen.
Build: PASS. Se mantiene ignoreBuildErrors heredado y se comprueba TypeScript
estricto independientemente, también después de regenerar los tipos de Next.

Chrome: PASS en anchos 320, 390, 768, 1024 y 1440 px, sin overflow horizontal.
Verificados login Guest de demo, enlaces anónimos/autenticados y acceso directo
anónimo sin tarjetas; activación de la barra por scroll, resumen del borrador,
modificación de fechas/huéspedes sin pérdida de datos y envío a resultados.
Fila legal accesible por encima de la barra al final de la página. Capturas de
footer escritorio/móvil inspeccionadas. Sin excepciones JavaScript ni errores
de consola en ese recorrido. No equivale a validar sesión o reservas Backend.

git diff --check: PASS. No commit/push, cambios de rama, modificaciones de
Backend/Android/XLSX, dependencias ni workflow. next-env.d.ts generado restaurado
a HEAD; artefactos del navegador permanecen fuera del working tree.
