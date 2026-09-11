# 04 — Navigation

Seguir journeys Figma.

Expo Router es el mecanismo de navegación aprobado. Sprint 0 contiene solamente `app/_layout.tsx`, `app/index.tsx`, `app/(guest)/_layout.tsx` y `app/(guest)/index.tsx`. La ruta Guest es una pantalla técnica Foundation, no una pantalla funcional ni una reproducción de Figma.

La navegación y back stack de Foundation se prueban con `expo-router/testing-library`, `renderRouter` y un filesystem de rutas in-memory. Las rutas funcionales nacen únicamente con sus tareas READY.

## Autoridad de navegación Guest para nuevas features

La fuente visual canónica `238:132 — Implementation Ready — Android V2 + V3` confirma la footbar `Servicios · Chat · Valet · Cuenta` en Chat (`238:192`), Servicios (`239:132`), Valet (`239:197`) y Cuenta (`240:132`). Las nuevas features derivadas de esa sección deben usar esa referencia visual.

No existe todavía un shell V3 compartido implementado. `IMP-AND-0100 — Android Guest Navigation Shell V3` está `READY` para implementarlo bajo `DEC-A-004`; hasta que se complete, ningún módulo debe copiar una footbar privada.

## Política aprobada del shell Guest V3

### Rutas objetivo y destinos no implementados

Las rutas objetivo conceptuales son `/services`, `/chat`, `/valet` y `/account`. Una ruta definida no implica que su archivo ni su feature existan. Actualmente `/services` es solo el handoff técnico de `IMP-AND-0102`; `/chat`, `/valet` y `/account` no existen.

Las cuatro tabs permanecen visibles y disabled hasta que su feature real esté autorizada e implementada. Una tab disabled no ejecuta navegación, no abre placeholders ni representa una feature disponible. Esto también aplica a Servicios mientras `/services` siga siendo únicamente un handoff técnico.

### Selección

`usePathname()` es la única fuente de verdad. Una tab está activa cuando pathname coincide con su `basePath` o inicia con `basePath + "/"`. No se crea un store global. Las rutas fuera del shell no tienen tab V3 seleccionada; un destino inexistente o disabled no simula selección.

### Accesibilidad

El shell usa la semántica de navegación/tablist que soporte React Native. Cada destino conserva su label visible, declara `accessibilityRole="tab"` y expone `selected: true` solo cuando está activo. Una tab no disponible expone `disabled: true` y no tiene handler ejecutable. Los targets miden al menos 44 × 44 dp, el orden accesible coincide con el visual y los hijos no duplican anuncios.

### Back stack

Cambiar entre tabs disponibles usa `router.replace(basePath)`: no acumula tabs principales mediante `push` ni conserva stacks independientes. Una ruta hija usa `router.push(childPath)` y Back usa el stack normal para regresar a la ruta anterior o raíz correspondiente. Desde una ruta raíz, Android Back conserva el comportamiento estándar de Expo Router/sistema. Tocar la tab activa es un no-op; una tab disabled no navega. Una pantalla fuera del shell no selecciona ninguna tab V3.

### Montaje

`IMP-AND-0100` crea infraestructura reutilizable, pero no envuelve globalmente `(guest)`, no monta el shell sobre Home V2 y no convierte `/services` en Servicios funcional. El primer consumidor productivo será una feature V3 autorizada; su validación inicial puede usar `expo-router/testing-library`.

## Excepción de navegación — IMP-AND-0102

La Home Guest (`/(guest)`) implementa `31:154 — MOB-02 — Inicio / Mi estadía`. Sus cuatro acciones navegan a `/services` únicamente como destino técnico para validar el back stack exigido por `IMP-AND-0102`. Esa ruta no contiene catálogo, solicitud, estados de negocio, DTO, endpoint ni funcionalidad de `IMP-AND-0103`.

La footbar V2 `Inicio · Solicitudes · Explorar · Hotel` de esa pantalla es parte de la excepción aprobada. No convierte V2 en navegación global ni reabre `IMP-AND-0102`; una migración eventual de Home corresponde al futuro trabajo transversal de shell.

La coexistencia V2/V3 es temporal: `IMP-AND-0100` no modifica Home, no agrega Inicio al shell V3 y no altera `StayHomeScreen`. Una futura migración requiere tarea y Change Control propios.

## MUST
- back stack coherente;
- deep links solo aprobados;
- auth guards coherentes;
- offline recovery.

Guest y Staff conservan contextos de navegación y sesión separados.

## MUST NOT
- saltar estados críticos;
- crear rutas paralelas inconsistentes con Web/account semantics.
