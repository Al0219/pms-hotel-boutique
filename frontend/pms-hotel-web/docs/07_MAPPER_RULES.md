# 07 — Mapper Rules

## Mapper = función pura

MUST:
- DTO -> Domain;
- determinista;
- sin side effects;
- testeable.

MUST NOT:
- fetch;
- localStorage;
- router;
- React state;
- DOM;
- logging de PII;
- decidir copy UX.

## Responsabilidades
- trim;
- null handling;
- parse number;
- parse dates;
- map enums;
- nested DTO mapping;
- normalización segura.

## Error
Si dato obligatorio es inválido:
usar estrategia tipada acordada.
No inventar silenciosamente un valor de negocio.

## Tests
Cada mapper importante:
- happy path;
- null;
- enum desconocido;
- malformed permitido;
- nested lists.
