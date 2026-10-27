# Room Service Staff — COMPLETADA / PASS

Incremento real autorizado por el usuario; owner de presentación WEB-3, ligado al
contrato Backend60 y guía Android43. /room-service integra StaffShell y scope
concreto de PropertyContext. INTAKE/OPS leen; solo OPS gestiona OPEN→IP→DONE con
confirmación. DTO→mapper→Domain→hook→DataTable; cantidades y precios snapshot/
total GTQ se leen del servidor. No red directa en UI ni imports internos de otros
módulos. BFF GET/PUT con cookies Staff, origen propio, proyección segura y no-store.
Backend revalida propiedad/permisos/versiones. Sin catálogo admin, cargos, pagos,
asignación ni cambios físicos de habitación; sin estados optimistas. Query por
sesión/propiedad y limpieza de cache al logout.19 pruebas específicas PASS y
39 de navegación/logout; typecheck/ESLint PASS. QA manual Room Service confirmado por el usuario. Publicación autorizada mediante
PR; sin merge. Ajuste final Android de feedback: PASS técnico / QA visual pendiente.
