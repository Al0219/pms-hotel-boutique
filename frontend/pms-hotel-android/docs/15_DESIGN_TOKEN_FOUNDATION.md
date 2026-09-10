# 15 — Design Token Foundation Android

## Fuente
Figma canónico: `238:132 — Implementation Ready — Android V2 + V3`.

## Valores observados
- Colores: `#252925`, `#292B29`, `#586456`, `#6B716C`, `#7C8B78`, `#EDF1EA`, `#F1F0EC`, `#F8F7F3`, `#FFFFFF`, `#000000`.
- Tipografía: Inter; tamaños observados 9, 10, 11, 12, 14, 15, 16, 18, 21, 24, 25, 26, 42 y 48.
- Radios: 10 y 14.
- Screen canónico `238:133`: inset horizontal 24, ancho de contenido 364, campos de 48 y botón de 44.

## Implementación Sprint 0
`src/shared/theme/tokens.ts` asigna nombres semánticos a estos valores y `styles.ts` los consume mediante React Native `StyleSheet`.

No hay dark mode, componentes visuales finales ni fuente empaquetada en Sprint 0. El token `Inter` conserva la trazabilidad de Figma; la carga de una fuente local requiere una tarea posterior aprobada.

## Reutilización acotada de tokens — IMP-AND-0102

La pantalla `31:154 — MOB-02 — Inicio / Mi estadía` es una excepción visual exclusiva de `IMP-AND-0102`. Reutiliza aliases semánticos compatibles con la Foundation existente: `border`, `pendingSurface`, `pendingText`, `chip` y `card`, con los valores observados `#E2E1DC`, `#F7ECD8`, `#A8732A`, 12 y 16.

Esta reutilización no convierte la referencia histórica en autoridad global ni altera la fuente canónica `238:132`. La referencia utiliza Lora en sus títulos, pero no existe una fuente empaquetada aprobada. La implementación conserva el token tipográfico existente sin declarar Lora como fuente disponible ni introducir una dependencia de fuentes en esta tarea.
