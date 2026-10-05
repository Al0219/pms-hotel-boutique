# Public 01 — Rediseño del inicio público

Fecha: 2026-10-04. Implementación: José / WEB-1. Tarea relacionada:
IMP-WEB-0101, Public 01 Booking público, ruta `/`. El usuario autorizó el
rediseño y proporcionó textos, paleta y distribución visual. El XLSX permanece
sin modificaciones y no se afirma cierre del journey completo ni revisión externa.

## Decisión visual autorizada

La especificación explícita sustituye la presentación anterior del inicio:
crema #F9F9F6, hero/footer #2E3531, CTA #5A6B5D, Serif Lora y Sans Inter.
La paleta está limitada al shell público; no cambia tokens globales ni Staff.
Se conserva CSS Modules, el mecanismo existente, sin instalar Tailwind ni
dependencias. No se cambia la carga de fuentes existente.

Header sticky con blur, navegación Guest, menú móvil y skip link; hero con
círculos CSS decorativos; buscador superpuesto; tres tarjetas editoriales;
footer. Las transiciones respetan prefers-reduced-motion. Modal compartido para
las vistas previas y la información del footer, por encima del header y con
retorno de foco al disparador.

## Funcionalidad y límites

El formulario reutiliza la validación, criterios en URL, bloqueo de doble envío
y navegación existentes. La variante landing agrupa fechas, huéspedes y CTA;
el panel de huéspedes conserva adultos, niños, habitaciones y promoción.
Si un campo oculto es inválido, el panel se abre y recibe foco. La variante
estándar de resultados conserva todos sus campos accesibles.

Las fechas de agosto de la descripción son ejemplos visuales pasados, no valores
iniciales. Se conserva el calendario dinámico y la recuperación de la URL.
Se elimina el límite de edad de niños del label: no existe contrato confirmado
que autorice asumir 0–12 años.

Las tarjetas son contenido editorial ilustrativo, nunca Availability ni una
cotización. Nombres y características comerciales definitivas requieren datos
del hotel. Ver habitación abre una vista previa con esos datos de referencia;
Consultar disponibilidad devuelve al buscador. No inventa roomTypeId, reserva,
endpoint, tarifa real, política de cancelación ni una ruta de detalle inexistente.

Privacidad/Cookies/Contacto abren información explícitamente pendiente hasta
recibir contenido o URLs oficiales. No se inventan políticas ni contactos.
Navegación usa `/habitaciones`, `/#amenidades`, `/mis-reservas` y `/acceso`.
Los contextos de sesión Guest/Staff no se modifican.

## Validación

- Lint y typecheck estricto: PASS, ejecutados independientemente del build.
- Build final: PASS. Se conserva la configuración heredada ignoreBuildErrors;
  no se usa como sustituto del typecheck.
- Regresión enfocada: 8 archivos / 75 pruebas PASS (booking, resultados,
  acceso Guest, cuenta, modal y layout Staff). No se repite ni se afirma una
  nueva ejecución de la suite completa de otros módulos por este rediseño.
- Chrome: PASS en anchos 320, 390, 768, 1024 y 1440 px. Hero/CTA usan los
  colores solicitados, header sticky y buscador superpuesto. Sin overflow
  horizontal; menú móvil, vistas previas sobre el header, Escape/retorno de
  foco, revelado/foco de ocupación inválida y búsqueda a resultados PASS.
  Sin excepciones JavaScript ni errores de consola en el recorrido validado.
- Capturas de escritorio y móvil inspeccionadas. La validación usa localhost:
  Next.js bloquea recursos de desarrollo desde el host alternativo 127.0.0.1;
  no se cambia la seguridad de devOrigins para hacer pasar la prueba.
- git diff --check: PASS. Sin cambios en dependencias, backend, Android,
  workflow ni XLSX. next-env.d.ts generado se restaura a su base.

Sin captura de referencia o archivo visual adjunto para comparación exacta, no se certifica
paridad pixel-perfect con Figma; se implementa la especificación proporcionada.
