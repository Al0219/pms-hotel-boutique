# 01 — Figma Screen Catalog Android

Referencia visual histórica:
`238:132 — Implementation Ready — Android V2 + V3`.

`31:132 — Reference — Android Early Journey` es únicamente una referencia histórica. No autoriza rutas, pantallas ni alcance funcional del backlog actual.

## Autoridad de navegación Guest

La footbar histórica de `31:132` es `Inicio · Solicitudes · Explorar · Hotel`. No es autoridad para nuevas features.

La navegación `Servicios · Chat · Valet · Cuenta` se verificó históricamente en:

- `238:192 — MOB-09 — Chat con hotel`;
- `239:132 — MOB-10 — Servicios / Upselling`;
- `239:197 — MOB-11 — Transporte / Valet`;
- `240:132 — MOB-12 — Mi cuenta / cargos`.

La referencia no es autoridad para el shell actual: IMP-AND-0114 adoptó la decisión frontend-first Inicio · Servicios · Valet · Hotel, con Chat flotante y drawer. Figma no contiene esa migración; `04_NAVIGATION.md` es la autoridad de navegación vigente.

## Autoridad visual — IMP-AND-0108 Access / Vincular reserva

La autoridad visual de `IMP-AND-0108` es `1841:410 — APPROVED FOR IMPLEMENTATION — IMP-AND-0108 — Access states`:

- Base: `1841:411 — MOB-19 — Access / Base`;
- validación local: `1841:431 — MOB-19 — Access / Validación local`;
- submitting: `1841:453 — MOB-19 — Access / Submitting`;
- reserva no encontrada: `1841:476 — MOB-19 — Access / Reserva no encontrada`;
- error: `1841:496 — MOB-19 — Access / Error`;
- offline: `1841:516 — MOB-19 — Access / Offline`.

`31:133 — MOB-01 — Access reservation` permanece únicamente como referencia histórica. `MOB-19` es la fuente de implementación para `/access`.

## Autoridad visual — IMP-AND-0109 Account / Stay Hub V3

La autoridad visual de `IMP-AND-0109` es `1839:410 — APPROVED FOR IMPLEMENTATION — IMP-AND-0109 — Account / Stay Hub states`:

- Base: `1839:411 — MOB-20 — Cuenta / Mi estadía`;
- Loading: `1839:443 — MOB-20 — Cuenta / Loading`;
- Error: `1839:458 — MOB-20 — Cuenta / Error`;
- Offline: `1839:473 — MOB-20 — Cuenta / Offline`.

`MOB-20` sustituye funcionalmente a `MOB-02` como Account / Stay Hub V3. `MOB-02` (`31:154`) permanece únicamente como referencia histórica.

## Excepción aprobada — IMP-AND-0102

Solo para `IMP-AND-0102`, la fuente aprobada es `31:154 — MOB-02 — Inicio / Mi estadía`, dentro de `31:132 — Reference — Android Early Journey`, porque `238:132` no contiene una pantalla equivalente de Stay Home.

Esta excepción no autoriza reutilizar la referencia histórica en otras tareas, ni sustituirla por `238:133 — MOB-08 Check-in digital`, `240:193 — MOB-13 Check-out digital` u otra pantalla V2/V3.

La footbar V2 implementada por esta excepción no convierte V2 en autoridad global. `IMP-AND-0102` permanece cerrada; `IMP-AND-0109` retiró su salida productiva al migrar la capacidad de estadía a Cuenta V3.

## 01 Estancia y servicios
- estancia;
- servicios;
- chat;
- valet.

## 02 Cuenta, checkout y factura
- account;
- checkout;
- invoice.

## 03 Loyalty, promociones y perfil
- rewards;
- promotions;
- profile.

## 04 Loading, error y offline
Estados universales.

## Política de autoridad Figma

Figma es una guía visual y de intención de producto para Android: informa jerarquía, contenido, componentes y estilo. No exige pixel parity, navegación histórica, tabs incompatibles, layouts que reduzcan usabilidad mobile ni estructuras que contradigan la arquitectura vigente.

Cuando una implementación literal entra en conflicto, el orden de decisión es: backlog, criterios funcionales y dependencias; contratos aprobados y reglas de negocio; arquitectura y navegación vigentes; coherencia frontend-first y UX mobile; y finalmente Figma como referencia visual. Cada desviación significativa conserva la intención funcional y se documenta en el contrato de la feature correspondiente; no autoriza funcionalidades adicionales.

Los Node IDs son solo trazabilidad documental; nunca son identificadores runtime.
