# 09 — Service Rules

## Service
Única capa de dominio que dispara request.

## MUST
- retornar DTO;
- tipar request/response;
- manejar HTTP status técnico;
- usar cliente común aprobado;
- propagar error técnico tipado.

## MUST NOT
- mapear Domain;
- mostrar toast;
- navegar;
- JSX;
- decidir copy;
- formatear.

## lib/http
Puede centralizar:
- base URL;
- headers;
- timeout;
- auth token injection;
- correlation headers si aplica.

No centralizar todos los endpoints en un archivo gigante.
