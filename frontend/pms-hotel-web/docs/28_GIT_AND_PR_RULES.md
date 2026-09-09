# 28 — Git and PR Rules Web

## Regla general
Una rama/PR debe representar un cambio cohesivo del backlog.

## Excepción aprobada Sprint 0
`IMP-WEB-0001` a `IMP-WEB-0017` pueden implementarse en la rama única `chore/web-sprint-0` y un PR de foundation, porque forman un solo baseline técnico indivisible.

Después de Sprint 0, preferir una tarea o slice cohesivo por rama/PR.

## PR debe indicar
owner, reviewer, tarea(s), módulos, Figma/fuente, cambios API/shared, tests y DoD.

## Cross-owner
Reviewer del dominio afectado obligatorio.

## Shared
Reviewer adicional obligatorio.

## No hacer
PR gigante con features no relacionadas, architecture change oculto, dependency upgrade no relacionado o rename masivo innecesario.
