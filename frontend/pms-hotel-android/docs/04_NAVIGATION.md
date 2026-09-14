# 04 — Navigation

Seguir journeys Figma.

Expo Router es el mecanismo de navegación aprobado. Sprint 0 contiene solamente `app/_layout.tsx`, `app/index.tsx`, `app/(guest)/_layout.tsx` y `app/(guest)/index.tsx`. La ruta Guest es una pantalla técnica Foundation, no una pantalla funcional ni una reproducción de Figma.

La navegación y back stack de Foundation se prueban con `expo-router/testing-library`, `renderRouter` y un filesystem de rutas in-memory. Las rutas funcionales nacen únicamente con sus tareas READY.

## Autoridad de navegación Guest para nuevas features

La fuente visual canónica `238:132 — Implementation Ready — Android V2 + V3` confirma la footbar `Servicios · Chat · Valet · Cuenta` en Chat (`238:192`), Servicios (`239:132`), Valet (`239:197`) y Cuenta (`240:132`). Las nuevas features derivadas de esa sección deben usar esa referencia visual.

`IMP-AND-0100 — Android Guest Navigation Shell V3` implementa el shell V3 compartido bajo `DEC-A-004`. Permanece sin montar hasta que una feature V3 autorizada sea su primer consumidor productivo; ningún módulo feature puede copiar una footbar privada.

## Política aprobada del shell Guest V3

### Rutas objetivo y destinos no implementados

Las rutas objetivo son `/services`, `/chat`, `/valet` y `/account`. Las cuatro existen como features autorizadas. `IMP-AND-0108` implementa además `/access` fuera del shell y la raíz `/` redirige a ese punto de entrada.

Servicios, Chat, Valet y Cuenta están habilitadas. Una tab disabled no ejecuta navegación, no abre placeholders ni representa una feature disponible.

### Selección

`usePathname()` es la única fuente de verdad. Una tab está activa cuando pathname coincide con su `basePath` o inicia con `basePath + "/"`. No se crea un store global.

- `/services` y `/services/*` → Servicios activa;
- `/chat` y `/chat/*` → Chat activa;
- `/valet` y `/valet/*` → Valet activa;
- `/account` y `/account/*` → Cuenta activa.

Las rutas fuera del shell no tienen tab V3 seleccionada. `/access` queda fuera de `GuestNavigationShell`, no muestra footbar ni tabs y, tras una vinculación mock exitosa, usa `router.replace('/account')`. `/account` inicia el contexto Guest vinculado con shell V3.

### Accesibilidad

El shell usa la semántica de navegación/tablist que soporte React Native. Cada destino conserva su label visible, declara `accessibilityRole="tab"` y expone `selected: true` solo cuando está activo. Una tab no disponible expone `disabled: true` y no tiene handler ejecutable. Los targets miden al menos 44 × 44 dp, el orden accesible coincide con el visual y los hijos no duplican anuncios.

### Back stack

Cambiar entre tabs disponibles usa `router.replace(basePath)`: no acumula tabs principales mediante `push` ni conserva stacks independientes. Una ruta hija usa `router.push(childPath)` y Back usa el stack normal para regresar a la raíz correspondiente. En particular, `/services/*` vuelve a `/services` y `/account/*` vuelve a `/account`. Desde una ruta raíz, Android Back conserva el comportamiento estándar de Expo Router/sistema. Tocar la tab activa es un no-op; una tab disabled no navega. Una pantalla fuera del shell no selecciona ninguna tab V3.

### Montaje

`IMP-AND-0100` crea infraestructura reutilizable, pero no envuelve globalmente `(guest)`. Servicios, Chat, Valet y Cuenta son consumidores productivos autorizados; Cuenta se incorporó con `IMP-AND-0109`. Su validación puede usar `expo-router/testing-library`.

## Excepción de navegación — IMP-AND-0102

La Home Guest histórica implementó `31:154 — MOB-02 — Inicio / Mi estadía` como excepción de `IMP-AND-0102`. En aquella tarea sus acciones usaban `/services` como handoff técnico; Servicios pasó posteriormente a ser una feature funcional autorizada por `IMP-AND-0103`.

La footbar V2 `Inicio · Solicitudes · Explorar · Hotel` de esa pantalla fue parte de la excepción aprobada. No convierte V2 en navegación global ni reabre `IMP-AND-0102`; `IMP-AND-0109` migró su capacidad de estadía al Account / Stay Hub V3.

No existe una entrada productiva V1 equivalente: la raíz redirige a `/account`, no agrega Inicio al shell V3 y no conserva un segundo hub de estadía.

## MUST
- back stack coherente;
- deep links solo aprobados;
- auth guards coherentes;
- offline recovery.

Guest y Staff conservan contextos de navegación y sesión separados.

## MUST NOT
- saltar estados críticos;
- crear rutas paralelas inconsistentes con Web/account semantics.

## IMP-AND-0110 — Servicios / Limpieza

`/services/housekeeping` implementa MOB-21 y reutiliza el shell V3 con Servicios activa. El launcher `Limpieza incluida` usa `router.push`; Back desde ese flujo vuelve a `/services`. La acción visible `Volver a servicios`, disponible también en success, usa `router.dismissTo('/services')`. IMP-AND-0110 COMPLETADA; el contrato mínimo y los valores frontend/mock provisionales están en `26_HOUSEKEEPING_CONTRACT.md`.
