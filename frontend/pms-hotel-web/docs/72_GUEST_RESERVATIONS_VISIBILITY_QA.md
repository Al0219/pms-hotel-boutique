# Visibilidad de reservas hechas como invitado — diagnóstico

Actualización: José elige verificar el correo y ver todas sus reservas SIN
cuenta. Contrato [Backend62](../../../backend/docs/62_PUBLIC_RESERVATION_LOOKUP_CONTRACT.md)
y decisión arquitectónica del2026-10-27 confirman el nuevo incremento. La evidencia
que sigue es histórica y corresponde únicamente al flujo de cuenta existente.
La implementación sin cuenta y sus gates se registrarán separadamente en Web73;
no reutilizar el PASS18 como aceptación de ese nuevo acceso.

Estado: **DIAGNÓSTICO ACLARADO**,2026-10-27. José confirma que desea consultar
sin iniciar sesión ni crear cuenta. La prueba siguiente acredita solo el flujo
de cuenta existente; no resuelve ese nuevo requisito de acceso sin cuenta.
Rama `fix/guest-reservations-visibility`, base origin/main909a12c (Amenidades175).
José autoriza investigar después de publicar el cierre Staff e3e68d6, cuya
simulación con ese main no tuvo conflictos. No merge ni publicación de este QA.

## Contrato vigente y evidencia inicial

Según [recuperación57](../../../backend/docs/57_GUEST_BOOKING_LINK_RECOVERY.md),
[API Guest56](../../../backend/docs/56_ANDROID_GUEST_MVP_CONTRACT_QA.md) y
[integración Web70](70_PUBLIC_RESERVATIONS_FLOW_QA.md), reservar como invitado
no crea GuestAccount ni sesión Guest. El historial privado requiere sesión Guest
y vínculos persistidos. La recuperación solo asocia reservas CONFIRMED cuyo
correo del responsable coincide con el correo verificado de esa cuenta.
No transfiere vínculos de otra cuenta ni toma IDs/correos del cliente como autoridad.

SQL inicial de solo lectura en el entorno habitual: una GuestAccount ACTIVE con
correo verificado, cero reservas CONFIRMED coincidentes y cero vínculos. Por ello
el historial de esa cuenta estaba realmente vacío. No se imprimieron correos,
credenciales o tokens de clientes ni se atribuyó esa cuenta al usuario.
Se solicitó aclarar si consulta sin sesión, con el mismo correo o con otro correo.

## Caso positivo real en3001

18 comprobaciones de navegador/HTTP PASS, Chrome, mismo Compose del hotel:

1. Acceso real Recepción y comprobación Guest401: sesión Staff coexistente,
   sin sesión Guest. Disponibilidad y cotización reales GTQ.
2. Checkout anónimo con correo de la cuenta demo existente del bootstrap local.
   Reserva `VZNLN9K5UV`, una habitación Classic,27→28 octubre2026,
   GTQ650.00, confirmación y pago SIMULATED/APPROVED. Sin cobro bancario.
   Crear la reserva no inicia Guest ni crea otra cuenta.
3. «Ver mis reservas» apunta a `/mis-reservas` y lleva al acceso contextual Guest,
   incluso con cookie Staff vigente; no redirige al dashboard privado.
4. Login real de la cuenta demo verificada del mismo correo: vuelve al historial,
   reconcilia y muestra la referencia. Solo aparece su reserva, no las demás.
5. Detalle de estancia persistido, recarga, móvil390px sin desbordamiento y
   sesiones independientes. Logout Guest conserva Staff; cierre Staff a Inicio.
   Sin excepciones JS ni respuestas API5xx.

SQL posterior: un único vínculo para la nueva reserva, link_source VERIFIED_EMAIL,
prueba source ACCOUNT y correo coincidente/verificado. Cuenta Guest1→1,
vínculos0→1 y migraciones31→31. El vínculo se generó mediante reconciliación real,
sin SQL de escritura ni cambiar verificación, autenticación, permisos o contratos.

Se conserva una reserva QA identificada en el hotel; no se elimina su historial:
`451a6643-4f0d-4e09-b3c6-4474ef059ddf`, estancia
`815693f9-f5d1-4844-a69a-3193db90f56e`, sin habitación física asignada.
No se ejecutó check-in/checkout de esta reserva ni se alteraron otras reservas.

La primera ejecución del harness omitió el documento ficticio obligatorio y se
detuvo en la validación del formulario antes de crear una reserva. Se completó
el dato en el harness y la corrida posterior pasó18/18; el reporte inicial FAIL
se conserva. No se modificaron validaciones ni código de producto para aprobarla.
Evidencia fuera de Git: `%TEMP%/pms-guest-visibility-qa` (reportes, intención/recibo,
captura de historial y SQL de solo lectura). No nueva corrida CI/build/Maven.

## Conclusión y siguiente paso

José aclara que consulta sin sesión y exige esa opción para clientes invitados.
Objetivo aprobado; [propuesta Backend62](../../../backend/docs/62_PUBLIC_RESERVATION_LOOKUP_CONTRACT.md)
separa consulta sin cuenta de vinculación al historial Guest. Queda pendiente
elegir entre una reserva por referencia+correo u otras reservas del correo
verificado; la aclaración se solicitó antes de ampliar los permisos de lectura.
Docker no tiene HMAC OTP ni proveedor SMTP/Resend configurados para entrega real.
No se modificó ese entorno ni se implementó un atajo de seguridad.

El flujo confirmado funciona con una identidad Guest del mismo correo verificado.
La evidencia inicial explica el vacío de la cuenta demo y conserva su alcance
histórico. No agregar un historial local,
asociaciones por correo sin verificar ni acceso anónimo a reservas privadas.

La nueva consulta sin cuenta requiere acordar su prueba de propiedad y alcance;
no se presume que el OTP actual, dependiente de GuestAccount, ya lo autorice.

Producto sin modificaciones; seguimiento en AlanPlan/AlanHandoff. Sin commit/push
Guest. El PR del cierre Staff se mantiene independiente de este diagnóstico.
