# IMP-AND-0116 — Cambiar estadía activa

Una sesión Guest autenticada puede navegar desde el drawer a `/reservations` para cambiar su `ActiveReservationContext` sin logout. La sesión conserva el mismo `accountId`.

La pantalla deriva INITIAL_SELECTION cuando no hay contexto y CHANGE_ACTIVE_STAY cuando lo hay. El modo inicial mantiene 0/1/N; el modo de cambio identifica la tarjeta con el texto **Estadía actual**, deshabilita el CTA hasta escoger una distinta y exige confirmación. Cancelar vuelve a `/account` sin mutar el contexto.

Android Back se consume en ambos modos y no navega, cierra sesión ni muestra modal. El drawer muestra Cambiar estadía solo con GuestAuthSession; el acceso temporal no lo muestra.

Los providers locales reservation-scoped se remontan por `reservationStayId`. A→B no expone estado de A; volver a A no promete persistencia porque no existe Backend ni almacenamiento local simulado. No se usa `queryClient.clear()` durante el cambio.
