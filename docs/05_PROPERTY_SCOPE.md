# 05 — Property Scope

## Objetivo
Evitar fugas de datos entre propiedades.

## PROPERTY

```text
PROPERTY(GT-HB-01)
```

Requiere membership ACTIVE.

## ALL_PROPERTIES

```text
ALL_PROPERTIES({
  GT-HB-01,
  GT-HB-03
})
```

Significa:
todas las propiedades autorizadas a esa sesión.

NO significa:
todas las propiedades del tenant.

## Permiso
`MULTI_PROPERTY_READ` para scope multi-property.

## Reglas

### MUST
- Resolver autorización antes de query.
- Scope no nulo en queries que lo requieran.
- Mantener propertyId en resultados operativos.
- Agregar métricas solo después de calcular por property.

### MUST NOT
- Query global y filtrar después.
- Fallback silencioso a ALL_PROPERTIES.
- Cambiar rol al cambiar scope.
- Mostrar selector global a Recepción sin permiso.

## Shared CRM
Master profile puede compartirse.
Operational data sigue property-scoped.

## Config
Brand puede ser global.
Fiscal/timezone/business date/hours sensibles son property-specific salvo regla explícita.
