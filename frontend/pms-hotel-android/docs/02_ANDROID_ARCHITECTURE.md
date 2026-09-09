# 02 — Android Architecture

La tecnología concreta se confirmará al iniciar Sprint Android.

## Capas mínimas
- remote/service
- dto
- mapper
- domain
- ui/state

## Principio
Mismo patrón conceptual que Web.

## No hacer
- UI con JSON crudo;
- DTO como ViewModel;
- network call directo desde Composable/View;
- business rule duplicada sin necesidad.

## Navegación
Separada de domain.
