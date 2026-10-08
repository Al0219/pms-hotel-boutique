# Private 07 — Implementación y evidencia QA

Fecha: 2026-09-24. Owner: WEB-2. Reviewer de backlog: WEB-3.
Contrato frontend/mock aprobado por el usuario: [32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md](32_PRIVATE_07_MOCK_CONTRACT_PROPOSAL.md).

## Resultado funcional

| Tarea | Ruta | Comportamiento implementado |
| --- | --- | --- |
| IMP-WEB-0901 | `/seguridad/roles` | Buscar, crear, duplicar y editar roles; matriz del catálogo existente; propiedades de ejemplo; guardar/descartar borrador; persistencia local. |
| IMP-WEB-0904 | `/seguridad/privacidad` | Consentimientos Marketing/Email y Marketing/SMS independientes; finalidad, fuente, fecha, evidencia y estado; activar/desactivar; solicitudes DSR simuladas pendientes. |
| IMP-WEB-0902 | `/seguridad/sesiones` | Metadatos seguros de sesiones ficticias; sesión actual; cierre individual y de las demás; logout persistente y reinicio explícito de demostración. |
| IMP-WEB-0903 | `/seguridad/mfa` | Estado desactivado, configuración pendiente, activación simulada, cancelación y desactivación confirmada; recuperación informativa. |

Todas las rutas comparten navegación, feedback accesible y estados de carga, error, reintento, guardado y desconexión. Los datos locales corruptos requieren recuperación explícita con confirmación. Una escritura fallida no produce éxito ni reemplaza el último estado confirmado.

## Arquitectura y límites

- Service → DTO → Mapper → Domain → TanStack Query → UI; MSW mantiene fixtures y almacenamiento. La UI no importa fixtures ni accede a storage/red.
- Transporte exclusivamente mock en el origen de la página: `/__mock/private-07/roles`, `/__mock/private-07/privacy` y `/__mock/private-07/security`. No son endpoints Backend ni usan `NEXT_PUBLIC_API_BASE_URL`.
- Claves locales versionadas: `pms:private-07:roles:v1`, `pms:private-07:privacy:v1`, `pms:private-07:security:v1`.
- No hay autenticación ni enforcement real. Editar roles no cambia la sesión, ni concede acceso a propiedades reales. Las listas de propiedades no se convierten implícitamente en ALL_PROPERTIES.
- Staff y Guest permanecen separados. No se almacenan códigos MFA, semillas, tokens, contraseñas, IP ni datos de cuentas reales.
- Las solicitudes DSR solo quedan pendientes en la simulación; no exportan ni eliminan datos.
- El provider espera al arranque de MSW antes de montar consumidores y permite reintentar si el worker falla. Las variables públicas se leen explícitamente para que Next.js las incorpore al bundle.

## Ejecución

Activar `NEXT_PUBLIC_USE_MOCK_API=true` antes de iniciar el servidor de desarrollo o compilar. El ejemplo de entorno del proyecto ya documenta esta opción. Ejecutar `npm run dev` y abrir cualquiera de las cuatro rutas. Para producción de demostración, compilar con la misma variable y ejecutar `npm run start`.

La persistencia depende del origen del navegador; cambiar host o puerto inicia otro almacenamiento. El modo mock requiere que el navegador permita Service Workers y almacenamiento local.

## Verificación realizada

- `npm run check`: PASS, con `NEXT_PUBLIC_USE_MOCK_API=true`.
- ESLint y boundaries: PASS.
- TypeScript strict: PASS.
- Vitest/RTL/MSW: **16 archivos, 69 pruebas PASS** en la suite completa.
- Build Next.js de producción: PASS; las cuatro rutas figuran en la salida.
- `git diff --check`: PASS.
- Chrome headless sobre el build final: PASS en 1440 × 1000 y 390 × 844, sin excepciones JavaScript ni desbordamiento horizontal en las cuatro rutas móviles.
- Recarga real: permisos editados, SMS desactivado, cierre de Staff y MFA activada sobreviven a recargar la página. Email permanece activo al desactivar SMS. El cierre Staff conserva una clave Guest independiente.
- Capturas revisadas: escritorio y móvil; tipografía Inter aplicada dentro del shell Private 07.

Las pruebas incluyen DTO obligatorio inválido, enums desconocidos, fechas inválidas, duplicados, roles sin configuración, guardado y descarte, nombres duplicados, consentimiento granular, storage fallido con reintento, respuesta demorada sin éxito anticipado, recuperación de datos corruptos, lista vacía, error de red, estado offline, cancelación del cierre, MFA cancelada/activada/desactivada y bloqueo de acciones MFA cuando la sesión simulada está cerrada.

## Pendientes de revisión externa

No se certifica conformidad exacta con Figma porque su fuente visual completa no está disponible en el repositorio. La revisión del owner/reviewer y el cotejo visual siguen pendientes. El XLSX no fue modificado ni se marcaron tareas COMPLETADA automáticamente.
