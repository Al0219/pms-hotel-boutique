# 30 — Definition of Done Web

## Code
- TypeScript strict PASS;
- lint PASS;
- typecheck PASS;
- tests PASS;
- build PASS;
- no `any` injustificado;
- no fetch directo UI;
- no DTO UI;
- mappers puros;
- boundaries PASS.

## Sprint 0
`npm run check` debe ejecutar lint + typecheck + test + build y terminar PASS.

## UI
Figma PASS, 0 clipping, 0 overlap no intencional, 0 control visible muerto, responsive cuando aplique.

## Navigation
Rutas válidas; back/continue/confirm correctos; no navegación accidental.

## States
Loading/Error/Empty/Offline/Submitting cuando aplique.

## Accessibility
Keyboard, focus, labels, contraste, target size, auth accessibility.

## Data/Security
Fixtures coherentes, cálculos/status/property scope correctos, no secrets/PII innecesaria, no PAN/CVV.

## Gate
Si falla un requisito: vuelve a EN_PROGRESO, corrige y re-QA. Solo después `COMPLETADA`.
