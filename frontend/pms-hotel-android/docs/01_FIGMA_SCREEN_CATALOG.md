# 01 — Figma Screen Catalog Android

Fuente canónica:
`238:132 — Implementation Ready — Android V2 + V3`.

`31:132 — Reference — Android Early Journey` es únicamente una referencia histórica. No autoriza rutas, pantallas ni alcance funcional del backlog actual.

## Autoridad de navegación Guest

La footbar histórica de `31:132` es `Inicio · Solicitudes · Explorar · Hotel`. No es autoridad para nuevas features.

Para nuevas features derivadas de `238:132`, la navegación Guest visible confirmada es `Servicios · Chat · Valet · Cuenta`. Se verificó en:

- `238:192 — MOB-09 — Chat con hotel`;
- `239:132 — MOB-10 — Servicios / Upselling`;
- `239:197 — MOB-11 — Transporte / Valet`;
- `240:132 — MOB-12 — Mi cuenta / cargos`.

Esta autoridad visual de navegación queda aprobada mediante Change Control para nuevas pantallas derivadas de `238:132`. Figma usa frames y textos locales; Android implementa el `GuestNavigationShell` V3 compartido como adaptación reutilizable de esa navegación.

Estado actual del shell: Servicios, Chat, Valet y Cuenta están disponibles. Cuenta fue habilitada por `IMP-AND-0109`.

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

## Regla
No inventar pantalla que contradiga Figma.

Los Node IDs son solo trazabilidad documental; nunca son identificadores runtime.
