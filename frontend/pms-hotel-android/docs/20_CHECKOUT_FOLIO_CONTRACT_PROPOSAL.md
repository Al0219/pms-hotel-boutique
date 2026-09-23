# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0203

## Checkout / Folio / Invoice

**Tarea:** `IMP-AND-0203 — Checkout e invoice`  
**Estado del contrato:** `APPROVED`
**Implementación:** `COMPLETADA`
**DoR:** `PASS`
**QA automática:** `PASS`
**QA manual:** `PASS`
**WEB-4:** `PASS`

La autoridad visual continúa siendo MOB-12, MOB-13 y MOB-14 de Figma. Las rutas Expo y las reglas de sesión de este documento son decisiones frontend-first; no se atribuyen a Figma.

## Runtime de sesión

Checkout lee el `ReservationStay` por su boundary público y las solicitudes de la sesión Guest. El flujo vigente es:

```text
módulo origen
→ builder del origen
→ SessionServiceRequest.billingSnapshot
→ CheckoutSessionReadModel vivo
→ confirmación final + mutation mock exitosa
→ CheckoutSessionSnapshot congelado
→ Invoice
```

`CheckoutSessionSnapshot` copia contenido, entradas, líneas y `checkoutTotal`. Una actualización o eliminación posterior de `SessionServiceRequest` puede afectar solo al read model vivo; Invoice no recalcula ni cambia el snapshot.

## Importe estructurado y total

`SessionBillingSnapshot` puede incluir `amountMinor`, `currency: 'GTQ'` y `amountNature`.

- Room Service construye líneas, cantidades, `priceText`, `totalText` y el importe confirmado desde su menú y carrito origen.
- Late Checkout construye precio de presentación e importe confirmado desde su catálogo origen.
- Transfer conserva el importe que ya calcula su origen con `amountNature: 'ESTIMATED'`.
- `CheckoutSessionReadModel`, fuera de la UI, calcula `checkoutTotal` con todos los importes estructurados GTQ cobrables, incluidos los estimados.
- Transfer se muestra como `Tarifa estimada`, conserva su metadata `ESTIMATED` y participa en `checkoutTotal`.
- Sin cargos cobrables, el total preparado es `Q0.00`.

No se parsea `priceText` para obtener dinero. Los DTOs históricos de Figma siguen siendo solo fixtures de presentación y no participan del folio runtime.

## Ventana local de servicios

Todo scheduler Guest con fecha usa `ReservationStay.arrival` y `ReservationStay.departure` como fechas locales de calendario. La ventana inclusiva es `max(arrival, today) → departure`; antes de arrival, después de departure o con una estancia vencida no existe fecha seleccionable. Los horarios del día actual mantienen su lead time; las fechas futuras usan sus horarios normales.

Limpieza, Room Service, Amenidades, Valet/vehículo y Transfer consumen esta regla compartida. Late Checkout no ofrece un calendario libre: solo corresponde a `departure` y sigue siendo singleton de sesión. Valet y Transfer permanecen disponibles tras Checkout únicamente dentro de esa misma ventana, incluido departure si el horario aplica.

## Check-out y estado de estancia

El check-out normal solo se habilita cuando la fecha local actual es igual o posterior a `ReservationStay.departure`. No se usa la hora como gate: el día de salida permite terminar temprano. Antes de esa fecha muestra cuándo estará disponible; si falta departure, muestra un estado neutral y no permite confirmar. La salida anticipada queda fuera de esta tarea.

Al pulsar `Check-out` se abre una confirmación final. Solo `Finalizar estancia` ejecuta `CheckoutService.submitCheckout`; cancelar no muta ni crea snapshot. Pending conserva la protección contra doble envío.

Para esta sesión frontend, `CheckoutSessionSnapshot != null` equivale a estancia finalizada. En ese estado:

- `/account/checkout` muestra `Check-out completado` y permite `Ver factura`; no crea un segundo snapshot.
- `/account` cambia el launcher a `Ver factura`.
- Servicios bloquea la creación de Room Service, Limpieza, Amenidades y Late Checkout, incluido acceso directo a esas pantallas.
- Solicitudes existentes e historial siguen visibles.
- Valet, Transfer, Chat, Hotel, Factura y Mis servicios continúan disponibles.

Late Checkout es singleton de sesión: mientras exista cualquier `SessionServiceRequest` `LATE_CHECKOUT`, sin importar su lifecycle, no se crea otro. Al eliminarlo mediante el lifecycle existente vuelve a habilitarse. Esta regla no se aplica a los demás kinds de solicitud.

## Navegación

| Ruta | Rol |
| --- | --- |
| `/account` | raíz Inicio; launcher Check-out o Ver factura según el snapshot |
| `/account/checkout` | hija de Account, `GuestChildHeader`, confirmación final o estado completado |
| `/account/invoice` | hija de Account; consume solo el snapshot congelado |

El éxito de la mutation session-only usa `router.replace('/account/invoice')`. Back desde Checkout o Invoice retorna de forma segura a `/account`. Las hijas no muestran footbar, drawer ni FAB Chat.

## Límites técnicos vigentes

El boundary continúa siendo frontend/mock: no existe Backend, pago, persistencia, cambio de `ReservationStay`, liberación de habitación, factura fiscal/FEL/SAT, almacenamiento de PDF ni proveedor de correo. Las acciones PDF y correo mantienen resultado de sesión sin archivo ni envío real; la UI Guest usa copy neutral (`Generar PDF`, `PDF generado`, `Enviar por correo`, `Correo enviado`).

## Cobertura requerida

- builders de Room Service, Late Checkout y Transfer con importe estructurado;
- total con Room Service, Late Checkout y Transfer estimado; total cero solo sin cargos cobrables;
- snapshot congelado;
- singleton/delete-re-enable de Late Checkout;
- fecha antes, durante y después de departure;
- confirmación, cancelación y doble submit;
- gates post-checkout en launchers y rutas directas;
- reentrada a Checkout e Invoice;
- auditoría estática y manual de copy visible Guest;
- regresión de Account, Servicios, Stay y navegación.
