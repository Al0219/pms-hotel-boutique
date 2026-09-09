# 30 — Definition of Done Web

## Code
- TypeScript PASS;
- lint PASS;
- imports PASS;
- no unjustified any;
- no direct fetch UI;
- no DTO UI;
- mappers pure;
- boundaries PASS.

## UI
- Figma PASS;
- 0 clipping;
- 0 unintentional overlaps;
- 0 dead visible controls;
- responsive where applicable.

## Navigation
- routes valid;
- back/continue/confirm correct;
- no accidental container navigation.

## States
- Loading/Error/Empty/Offline/Submitting as applicable.

## A11y
- keyboard;
- focus;
- labels;
- contrast;
- target size;
- auth.

## Data
- coherent fixture;
- calculations;
- status;
- property scope.

## Tests
Required layer tests PASS.

## Rule
Any failed required check:
PENDING -> fix -> re-QA -> only then COMPLETE.
