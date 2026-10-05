# Public 01 — Datos del huésped

## Alcance

Slice frontend autorizado por José para `IMP-WEB-0107`, WEB-1 / revisión WEB-2, `/reserva/checkout`. Continúa la revisión de selección (documento 41). No se modifica el XLSX ni se declara finalizada la creación transaccional, asignación de ocupantes por stay, garantía o confirmación. El cotejo formal con Figma y la revisión humana siguen pendientes.

## Implementación

- Stepper accesible: selección completada, datos activos y pago pendiente. Crema, blanco, oliva y resumen salvia sticky; columnas apiladas en móvil.
- Nombre, apellidos, correo, teléfono con sugerencias de prefijos internacionales y código editable, país/región (Guatemala por defecto), documento opcional y solicitudes de hasta 300 caracteres.
- Validación de formato al salir del campo y al enviar, errores vinculados mediante `aria-describedby`, `aria-invalid`, foco en el primer error y bloqueo de doble envío. No se presume validez legal de un documento ni que el teléfono sea alcanzable. La aceptación definitiva corresponde al backend.
- Contexto Checkout separado de Booking y Guest Auth. Guarda datos únicamente en memoria del layout público, asociados a propiedad y búsqueda. No escribe contacto/documentos/solicitudes en URL, storage o logs. Volver a la selección, acceder con el login demo o avanzar mantiene los datos. Recargar o cerrar la aplicación descarta el borrador y el carrito.
- Acceso Guest opcional: la ruta de acceso acepta un retorno limitado a `/reserva/checkout` y conserva los criterios. Después de entrar, «Usar datos de mi cuenta» completa solo campos vacíos desde GuestProfile, mediante el vínculo explícito obtenido por AccountSummary. No usa el correo de GuestAccount como contacto, no infiere IDs ni modifica el perfil. País de residencia y campos opcionales se revisan manualmente.
- Resumen revalida selección/cotizaciones existentes. Conserva USD/GTQ indicativo; cargos ausentes se muestran pendientes y monedas distintas no se suman. La selección no retiene inventario.
- El candado dice «Datos solo en esta sesión» en HTTP y «Conexión cifrada» en HTTPS. No se promete cifrado de una reserva que todavía no existe.
- Tras la transición visual, el destino `/reserva/checkout/pago` presenta los datos para el Paso 3. Exige una selección válida y la aprobación del formulario para esa selección; editar los datos invalida la aprobación. El destino informa que pago/garantía están pendientes. No recolecta tarjeta, llama al simulador de garantía ni crea cuentas, perfiles, reservas o pagos.

## Arquitectura y límites

Dominio puro de validación/prefill → contexto de borrador → formulario y páginas. Las rutas son composiciones delgadas. Availability, Guest Auth y GuestProfile conservan sus Services/DTO/Mappers/hooks; Checkout consume solo APIs públicas de módulos, sin fetch directo ni imports de mocks/DTOs en UI. No hay Booking → Checkout ni un segundo provider de sesión Guest.

El contrato público de disponibilidad y las consultas de perfil existentes continúan siendo provisionales. El acceso de demostración se prueba con MSW. El retorno OAuth real mediante una redirección externa recarga la aplicación y no conserva este borrador en memoria: necesita una solución de continuidad y contratos aprobados antes de afirmar soporte completo. No se agregan endpoints backend ni reglas fiscales/financieras.

## Prueba manual

En `frontend/pms-hotel-web`, usar la configuración mock local y `npm run dev -- --port 3000`. Abrir `http://localhost:3000`, buscar fechas futuras, seleccionar habitación, revisar y «Continuar con mis datos».

1. Enviar vacío: aparecen errores y el foco vuelve al nombre. Corregir correo/teléfono y observar la validación.
2. Completar datos, documento opcional y solicitudes; comprobar contador, resumen y selector USD/GTQ.
3. Opcional: iniciar sesión demo, volver con «Continuar mi reserva» y usar datos de la cuenta; lo escrito antes se conserva.
4. Continuar al Paso 3, revisar contacto y regresar con «Editar mis datos»: los campos permanecen.
5. Cambiar búsqueda o recargar: no se reutiliza información de otra selección ni se permite saltar la validación. No se crea ni cobra una reserva.

Pruebas: validación/formato, obligatoriedad, accesibilidad, doble envío, navegación y persistencia, aislamiento de búsqueda, ausencia de escritura financiera/storage, vínculo explícito de perfil y retorno seguro del login. Se ejecutan también regresiones afectadas de Booking, Availability, Guest Auth y Profile, lint, TypeScript estricto, build y revisión Chrome móvil/escritorio.

Resultado local: 21 archivos / 179 pruebas PASS; lint, TypeScript estricto y build PASS. Chrome PASS en 320, 390, 768, 1024 y 1440 px: validación, ida/vuelta, login demo, moneda y búsqueda conservados, vacío seguro al recargar y sin errores de consola. Esta validación local no sustituye los checks de GitHub ni la revisión de los responsables.
