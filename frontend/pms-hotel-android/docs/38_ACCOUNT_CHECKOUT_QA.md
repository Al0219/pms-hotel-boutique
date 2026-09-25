# IMP-AND-0204 — QA Cuenta / Checkout / Factura

## Matriz QA automática

| Área | Evidencia | Resultado |
| --- | --- | --- |
| Account / Stay Hub | account-stay-hub, stay-contract | Stay activo, loading, error, offline y reintento | PASS |
| Profile | profile, account-profile-contract | Account/Profile separados, validación, save y dirty guard | PASS |
| Checkout | checkout-invoice, checkout integration, post-checkout | Read model, effective checkout, confirmación, retry y snapshot | PASS |
| Invoice | invoice screen, PDF, integration | Referencia, estado, total, navegación y representación frontend | PASS |
| Navegación / logout | guest-navigation | Back, drawer, logout y child routes | PASS |
| Contexto / access temporal | guest-auth foundation, access | Account y rutas reservation-scoped respetan contexto activo | PASS |

## Coherencia y seguridad

Los totales y estados se leen de los read models y CheckoutSessionSnapshot aprobados; la UI no recalcula finanzas ni infiere reglas fiscales. La revisión estática no halló persistencia prohibida, tokens, logs de secretos, Stay global productivo ni dependencia Staff en Account/Checkout.

## Defectos y correcciones

No se detectaron defectos productivos durante la QA automática. No hubo cambios de producto.

## Warnings no bloqueantes

Jest puede informar open handles y avisos act(...) de actualizaciones asíncronas existentes. No representan fallos funcionales de Cuenta, Checkout o Factura.

## Escenarios manuales pendientes

- Confirmar teclado y accesibilidad en dispositivo Android.
- Verificar Back y drawer con navegación real de dispositivo.
- Revisar presentación visual PDF y resolución de visor/compartir en Android.
- Confirmar transiciones de Access temporal y logout en dispositivo.

## Limitaciones frontend-first

Invoice/PDF son representación mock/frontend y no constituyen factura fiscal, FEL, SAT ni pago Backend. Los datos reservation-scoped no se persisten sin Backend.
