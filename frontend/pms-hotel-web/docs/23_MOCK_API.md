# 23 — Mock API

## Objetivo
Probar pipeline real.

## Preferido
Mock a nivel de red:

UI -> Hook -> Service(fetch) -> DTO -> Mapper -> Domain.

## No preferido
Component -> imported perfect mock Domain.

## Fixtures
Usar IDs coherentes del Figma.

## Casos
- success
- null
- empty
- error
- offline
- delayed
- conflict cuando aplica

## Provisional contract
Todo mock DTO debe referenciar contrato provisional documentado.
