# 06 — Security Backend

Backend es frontera final de autorización.

No PAN/CVV.
Secrets en secret manager/config segura.
No PII innecesaria en logs.
Validate all input.
Rate limit/auth protections según arquitectura futura.

## Foundation aprobada

- Spring Security usa `SecurityFilterChain`, no `WebSecurityConfigurerAdapter`.
- La API Spring acepta autenticación bearer y mantiene sesiones HTTP stateless.
- Guest y Staff usan identidades, audiencias de JWT, refresh tokens y cookies
  BFF separados.
- Los JWT no contienen contraseñas, refresh tokens, PAN, CVV ni saldos.
- El Backend vuelve a validar permiso, membership y property scope aunque el
  BFF o una UI hayan realizado una validación previa.
