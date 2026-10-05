# WEB-1 — Búsqueda pública y siguientes entregas

Fecha: 2026-10-04. Responsable de implementación: José, por autorización del
usuario para completar WEB-1. Rama: `feature/web1-public-booking`, desde
`origin/main` `d258d60`. Reviewer de búsqueda/disponibilidad: WEB-4;
componentes compartidos: WEB-2. No se afirma revisión externa.

## Primera entrega: IMP-WEB-0101

Se reutilizan Button e Input existentes (S101/S102), con sus pruebas. Foundation
está COMPLETADA en el XLSX. El usuario autorizó continuar el booking público;
las filas de features permanecen PENDIENTE y no se modifica el XLSX. La revisión
humana y visual no se sustituyen por esta autorización de implementación.

- Búsqueda por llegada/salida, adultos, niños y cantidad de habitaciones.
- Fechas de calendario reales, salida posterior a llegada y llegada no pasada.
- Cantidades enteras seguras; adultos/habitaciones positivos y niños no negativos.
  No se deducen capacidades ni límites máximos de venta desde este formulario.
- Los criterios, incluida la cantidad de habitaciones, se conservan en la URL.
  La página de inicio recupera sus criterios al abrir una URL con parámetros;
  no convierte números inválidos o repetidos en cantidades válidas.
  La promoción se transporta como código opaco, sin calcular descuentos.
- Envío con bloqueo de doble ejecución, campos bloqueados durante una búsqueda
  pendiente, recuperación tras error y conservación de los datos escritos.
- Errores accesibles; foco en el primer campo inválido. UI sin fetch ni DTO.
- Corrección mínima de tokens compartidos: `--font-inter` y `--font-lora` no
  existen en el layout actual, lo que invalidaba las declaraciones CSS y hacía
  aparecer la fuente predeterminada. El fallback de var() conserva las familias
  Inter/Lora aprobadas en `31_DESIGN_TOKEN_FOUNDATION.md`. Reviewer shared: WEB-2;
  no se cambia la estrategia de carga de fuentes ni se incorporan dependencias.

`propertyTimeZone` permite usar el día de calendario de la propiedad cuando el
consumidor proporciona su timezone. Sin metadatos públicos de propiedad
confirmados, el formulario conserva el calendario local del entorno para sus
valores iniciales; no lo presenta como timezone del hotel ni como validación
definitiva del servidor. Las fechas no se convierten en instantes de estancia.
La integración pública deberá suministrar el timezone autorizado de la propiedad.
Los valores iniciales calculados con el reloj se muestran después de hidratar;
no se conserva una fecha del build ni se produce una discrepancia de calendario
entre el HTML del servidor y el navegador.

## Contratos y límites

El DTO/service/mapper de Availability existente sigue siendo PROVISIONAL.
No se inventan endpoints Backend, tarifas, políticas, permisos ni reglas de
capacidad. El backend existente de ATS es Staff; no se usa una sesión Staff
para habilitar una consulta Guest. Payments y creación pública requieren sus
contratos HTTP antes de declarar integración real.

No se avanza el estado formal de 0102/0103/0104 ni el DoD del recorrido completo.
La primera entrega corrige el formulario; checkout, multi-room, revalidación y
confirmación se completan en entregas sucesivas con sus dependencias.

## Decisión de rutas aprobada

El backlog 0102/0103 y `02_ROUTE_ARCHITECTURE.md` reservan `/habitaciones` para
resultados públicos. El código anterior montaba allí el tablero Staff bajo
`(private)`. Los Route Groups no cambian el pathname, por lo que no pueden
coexistir dos páginas con esa URL. Fuentes: `docs/01_SOURCE_OF_TRUTH.md` global,
backlog y arquitectura de rutas Web.

José confirmó explícitamente el 2026-10-04 mantener `/habitaciones` pública y
trasladar el tablero Staff a `/staff/habitaciones`. Se aplica el traslado y se
actualiza su menú, conservando el componente y layout privado existentes.
Los enlaces Guest a `/habitaciones` continúan apuntando a la experiencia pública.
La siguiente entrega de resultados se registra en `36_PUBLIC_AVAILABILITY_RESULTS.md`.

## Validación

Pruebas de dominio y formulario: fechas inexistentes, enteros/NaN/overflow,
cantidad de habitaciones, criterios en URL, zona horaria explícita, foco,
búsqueda pendiente, doble envío, error y reintento. Los relojes de pruebas se
fijan para evitar fallos al transcurrir el tiempo.

- `npm ci --no-audit --no-fund`: PASS con el lockfile vigente, sin modificar
  dependencias.
- Lint y typecheck del árbol final: PASS.
- `npm run build`: PASS. Next.js conserva `ignoreBuildErrors` de main; por eso
  typecheck se ejecutó y pasó independientemente. No se modifica esa configuración.
- Primera ejecución enfocada: 4 archivos / 44 pruebas PASS. Después se añadieron
  dos casos de restauración de criterios, incluidos en la regresión completa.
- Regresión completa final: `npm run test -- --maxWorkers=2 --testTimeout=15000
  --reporter=dot`, 190 archivos / 837 pruebas PASS. La primera ejecución, con
  build concurrente, tuvo un fallo de espera en `src/test/private-09.test.tsx:26`
  mientras la UI aún mostraba carga. Esa prueba y sus módulos son idénticos a
  origin/main y no consumen booking. La ejecución aislada pasó 14/14 y la
  regresión completa posterior pasó sin build concurrente. No se modificaron
  esas pruebas ni sus assertions para obtener el resultado.
- Build final y Chrome después del ajuste de tokens: PASS. Restauración de criterios, rechazo de cero
  habitaciones y foco PASS. Escritorio 1440 × 1000 y móvil 390 × 844, sin
  desbordamiento horizontal, excepciones JavaScript ni errores de consola.
  Capturas inspeccionadas en ambos tamaños; no equivalen a comparación con Figma.
- `git diff --check`: PASS. Sin cambios de Backend, Android, XLSX ni fixtures
  de otros módulos. Se restaura el archivo generado next-env.d.ts a su base.

Pendiente: revisión visual contra Figma y aprobación de reviewers. No hay
certificación del booking completo ni del backend público por esta entrega.
