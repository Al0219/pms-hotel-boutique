# APPROVED FRONTEND DATA/MOCK CONTRACT — IMP-AND-0104

## Chat con Recepción

**Tarea:** `IMP-AND-0104 — Chat con Recepción`  
**Estado del contrato:** `APPROVED`  
**Autoridad visual:** Figma `238:192 — MOB-09 — Chat con hotel` y `334:132 — MOB-09 — Chat / Mensaje enviado`  
**Navegación:** `/chat` dentro de Guest Navigation V3  
**Reviewer:** `WEB-3`  
**Dependencia funcional:** `IMP-AND-0102` completada  
**DoR objetivo:** `Messaging frontend/mock contract approved`

---

## 1. Propósito

Definir el contrato frontend/mock mínimo para implementar el Chat con Recepción completamente sin Backend, usando datos dummy locales y preservando la arquitectura Android frontend-first.

Flujo objetivo:

```text
src/data/mocks/chat/
→ mock boundary
→ fixture DTO
→ mapper
→ domain
→ TanStack Query / Mutation
→ UI
```

Este contrato **no es una API Backend** y no define endpoints, HTTP, persistencia, autenticación, IDs Backend ni esquema de base de datos.

---

## 2. Autoridad Figma confirmada

Frames canónicos:

- `238:192 — MOB-09 — Chat con hotel`
- `334:132 — MOB-09 — Chat / Mensaje enviado`

Elementos confirmados:

- Título: `Chat con el hotel`
- Contexto visible: `Recepción · María López · HB-2026-08421`
- Historial de conversación entre:
  - `Recepción`
  - `Tú`
- Composer inicial: `Escribe un mensaje…`
- CTA inicial: `Enviar`
- Estado posterior al envío:
  - nuevo mensaje del huésped agregado al thread;
  - composer: `Mensaje enviado ✓`;
  - CTA: `Nuevo mensaje`.
- Guest Navigation V3:
  - Servicios
  - Chat
  - Valet
  - Cuenta

La lógica aprobada de navegación prevalece sobre inconsistencias visuales del mockup:

```text
/chat → Chat activo
```

No debe copiarse un estado visual incorrecto donde `Servicios` aparezca activo dentro de Chat.

---

## 3. Contenido dummy confirmado por Figma

El historial inicial puede reproducir exactamente el escenario visual aprobado:

```text
Recepción:
Hola María, ¿en qué podemos ayudarte?

Tú:
Necesito un taxi mañana a las 6:00.

Recepción:
Claro. ¿Destino Aeropuerto La Aurora?

Tú:
Sí, por favor.

Recepción:
Listo. Solicitud #4832 creada · salida 06:00.
```

El texto `Solicitud #4832...` es **contenido de presentación del fixture**, no un `requestId`, entidad Backend ni contrato de Transporte.

---

## 4. Reglas funcionales confirmadas

1. El huésped conversa únicamente con **Recepción**.
2. La UI distingue visualmente mensajes del huésped y mensajes de Recepción.
3. El usuario puede escribir un mensaje.
4. Un mensaje vacío o compuesto únicamente por espacios no se envía.
5. El envío se realiza mediante una mutation mock.
6. Mientras el envío está pending:
   - el CTA no debe disparar un segundo envío concurrente;
   - no debe añadirse un mensaje exitoso antes de resolver la mutation.
7. Después de success, el mensaje enviado se incorpora a la conversación.
8. El estado visual de success sigue `334:132`: `Mensaje enviado ✓` y CTA `Nuevo mensaje`.
9. `Nuevo mensaje` devuelve el composer al estado editable sin borrar el historial.
10. Error y offline no deben mostrar detalles técnicos.
11. Offline se modela con `NetworkError`.
12. No existe cola offline, persistencia local, background sync ni envío automático posterior.
13. No se requiere una respuesta automática de Recepción después de cada mensaje enviado.
14. Los mensajes de Recepción que aparecen durante esta tarea provienen del dataset dummy inicial.

La regla 13 mantiene el contrato mínimo: Figma demuestra que Recepción responde, pero no demuestra que deba generarse una respuesta automática inmediatamente después de cada envío del huésped.

---

## 5. Contrato frontend/mock aprobado propuesto

```ts
export type ChatMessageAuthorFixture = "GUEST" | "RECEPTION";

export interface ChatFixtureContextDto {
  guestDisplayName: string;
  stayReferenceText: string;
}

export interface ChatMessageFixtureDto {
  fixtureKey: string;
  author: ChatMessageAuthorFixture;
  text: string;
}

export interface ChatConversationFixtureDto {
  context: ChatFixtureContextDto;
  messages: ChatMessageFixtureDto[];
}

export interface SendChatMessageFixtureInput {
  text: string;
}

export interface SendChatMessageFixtureResult {
  message: ChatMessageFixtureDto;
}
```

### Semántica de los campos

#### `guestDisplayName`

Texto visible usado en el contexto del chat.

Ejemplo:

```text
María López
```

No establece un modelo Backend de identidad.

#### `stayReferenceText`

Texto visible de referencia de la estadía/reserva.

Ejemplo:

```text
HB-2026-08421
```

Es presentación frontend y **no implica** `reservationId`, PK, UUID ni formato contractual Backend.

#### `fixtureKey`

Identidad técnica local utilizada únicamente para:

- React keys;
- determinismo de fixtures;
- tests.

No es un ID Backend.

#### `author`

Solo admite:

```text
GUEST
RECEPTION
```

No deben agregarse departamentos, bots o actores adicionales sin nueva autoridad funcional.

#### `text`

Contenido visible del mensaje.

No contiene HTML ni metadata adicional.

---

## 6. Domain mínimo

La UI no consume Fixture DTOs directamente.

Modelo conceptual recomendado:

```ts
export type ChatMessageAuthor = "guest" | "reception";

export interface ChatMessage {
  key: string;
  author: ChatMessageAuthor;
  text: string;
}

export interface ChatContext {
  guestDisplayName: string;
  stayReferenceText: string;
}

export interface ChatConversation {
  context: ChatContext;
  messages: ChatMessage[];
}
```

El mapper realiza exclusivamente la transformación:

```text
Fixture DTO → Domain
```

La diferencia de casing entre fixture y domain permite mantener explícita la frontera sin introducir semántica Backend.

---

## 7. Mapper

El mapper debe:

- convertir `fixtureKey` → `key`;
- convertir `GUEST` → `guest`;
- convertir `RECEPTION` → `reception`;
- preservar `text`;
- preservar `guestDisplayName`;
- preservar `stayReferenceText`.

No debe:

- inventar timestamps;
- crear IDs;
- inferir habitación;
- crear status de lectura;
- crear status de entrega;
- enriquecer el mensaje con datos inexistentes.

---

## 8. Dataset dummy

Ubicación canónica:

```text
src/data/mocks/chat/
```

Dataset mínimo conceptual:

```ts
{
  context: {
    guestDisplayName: "María López",
    stayReferenceText: "HB-2026-08421"
  },
  messages: [
    {
      fixtureKey: "chat-message-reception-01",
      author: "RECEPTION",
      text: "Hola María, ¿en qué podemos ayudarte?"
    },
    {
      fixtureKey: "chat-message-guest-01",
      author: "GUEST",
      text: "Necesito un taxi mañana a las 6:00."
    },
    {
      fixtureKey: "chat-message-reception-02",
      author: "RECEPTION",
      text: "Claro. ¿Destino Aeropuerto La Aurora?"
    },
    {
      fixtureKey: "chat-message-guest-02",
      author: "GUEST",
      text: "Sí, por favor."
    },
    {
      fixtureKey: "chat-message-reception-03",
      author: "RECEPTION",
      text: "Listo. Solicitud #4832 creada · salida 06:00."
    }
  ]
}
```

Los textos son fixtures de presentación.

---

## 9. Query de conversación

TanStack Query continúa siendo la autoridad de server-like state.

La query mock debe poder representar:

```text
loading
data
generic error
offline
```

Offline se deriva de `NetworkError`.

No introducir:

- NetInfo;
- WebSocket;
- polling real;
- persistencia local;
- store paralelo;
- background sync.

`RemoteState` puede derivarse de Query siguiendo la infraestructura vigente.

---

## 10. Mutation de envío

Input:

```ts
SendChatMessageFixtureInput
```

Resultado:

```ts
SendChatMessageFixtureResult
```

Flujo:

```text
texto local
→ trim
→ validación no vacío
→ mutation pending
→ mock boundary
→ fixture result
→ mapper
→ incorporar mensaje del huésped a la conversación visible
```

### Pending

Mientras `isPending`:

- `Enviar` no produce un segundo submit;
- no existe optimistic success;
- el texto no se representa como enviado hasta resolver success.

### Success

La mutation devuelve un mensaje `GUEST` nuevo con una `fixtureKey` local determinista.

La UI reproduce el estado aprobado `334:132`:

```text
mensaje agregado al thread
composer → "Mensaje enviado ✓"
CTA → "Nuevo mensaje"
```

`Nuevo mensaje` restablece el composer editable y conserva el historial.

No genera automáticamente un mensaje de Recepción.

### Generic error

La UI conserva el texto escrito para permitir retry.

Copy exacto se definirá en QA visual si Figma no contiene un estado dedicado.

### Offline

`NetworkError` representa ausencia simulada de conectividad.

La UI conserva el texto y permite retry.

No promete envío posterior automático.

---

## 11. Estado local de UI

El draft del composer es estado local de UI.

No debe almacenarse en TanStack Query.

Conceptualmente:

```text
draftText: string
```

Reglas:

- placeholder: `Escribe un mensaje…`;
- trim para validar envío;
- vacío/whitespace → CTA no envía;
- success → limpiar composer;
- error/offline → conservar composer para retry.

No se define límite máximo de caracteres porque Figma/backlog no proporciona uno.

---

## 12. Navegación

Route esperada:

```text
/chat
```

Debe consumir `GuestNavigationShell`.

Estado esperado del shell durante la implementación de `IMP-AND-0104`:

```text
Servicios  enabled
Chat       enabled
Valet      disabled
Cuenta     disabled
```

En `/chat`:

```text
Chat = selected
```

No crear footbar privada dentro del módulo Chat.

---

## 13. Estados visuales

Figma `238:192` confirma el estado principal/data y `334:132` confirma el estado posterior a un envío exitoso.

Para implementación se requieren técnicamente:

### Lectura

- loading
- data
- generic error
- offline

### Envío

- idle
- pending
- success
- generic error
- offline

Si Figma no posee frames explícitos de error/offline/loading, deben diseñarse o aprobarse siguiendo los patrones Android V3 antes del cierre visual de la feature.

No inventar Empty state salvo que el Acceptance Criteria lo requiera.

---

## 14. Campos deliberadamente excluidos

No forman parte de `IMP-AND-0104`:

```text
userId
guestId
staffId
reservationId
stayId
propertyId
roomId
conversationId
threadId
channelId
messageId Backend
createdAt
updatedAt
sentAt
deliveredAt
readAt
deliveryStatus
readStatus
typingIndicator
onlineStatus
avatar
attachments
files
images
audio
reactions
replyTo
mentions
department
bot
pushToken
socketId
```

También quedan fuera:

- WebSocket real;
- Firebase Chat;
- unread badge contractual;
- read receipts;
- typing;
- attachments;
- búsqueda;
- edición;
- borrado;
- reacciones;
- múltiples conversaciones.

Cualquier futura necesidad de estos conceptos requiere autoridad adicional.

---

## 15. Pruebas obligatorias de implementación

La feature deberá cubrir como mínimo:

1. Query renderiza contexto de Chat.
2. `guestDisplayName` visible.
3. `stayReferenceText` visible.
4. Historial dummy contiene los mensajes aprobados.
5. Mapper Fixture DTO → Domain.
6. `GUEST` → `guest`.
7. `RECEPTION` → `reception`.
8. UI no consume DTOs.
9. UI no importa fixtures.
10. UI no hace fetch/red directa.
11. Composer muestra `Escribe un mensaje…`.
12. Mensaje vacío no se envía.
13. Mensaje whitespace no se envía.
14. Texto válido dispara una mutation.
15. Pending bloquea double submit.
16. No existe optimistic success.
17. Success incorpora mensaje del huésped.
18. Success muestra `Mensaje enviado ✓`.
19. `Nuevo mensaje` restablece el composer editable y conserva el thread.
20. Generic mutation error conserva draft.
21. Retry después de error.
22. `NetworkError` mutation → offline.
23. Retry después de offline.
24. Conversation loading.
25. Conversation generic error.
26. Conversation `NetworkError` → offline.
27. GuestNavigationShell reutilizado.
28. `/chat` marca Chat activo.
29. Services permanece enabled.
30. Valet/Cuenta permanecen disabled.
31. Back stack esperado.
32. Tests previos de Stay/Services/navigation continúan PASS.

---

## 16. Futuro Backend

Cuando exista Backend:

```text
ChatMockService
        ↓ reemplazo
ChatApiService
```

Se intentará conservar estables:

- Domain;
- UI;
- hooks públicos;
- Query keys;
- navegación.

Los DTO Backend podrán ser completamente distintos a los Fixture DTO.

No existe obligación de conservar:

```text
fixtureKey
stayReferenceText
ChatMessageAuthorFixture
```

como nombres de API.

---


## 16.1. Nota sobre el frame genérico Offline existente

La sección canónica también contiene `243:1881 — MOB-V2 — Offline`, cuyo copy dice:

```text
Tus mensajes se enviarán cuando recuperes internet.
```

Ese copy implica una cola/reenvío automático offline y **no es compatible** con la política frontend-first aprobada para Android, que no autoriza cola offline, background sync ni envío posterior automático.

Por tanto, `243:1881` puede servir únicamente como referencia visual genérica; su semántica de mensajes **no forma parte** del contrato de `IMP-AND-0104`.

El estado offline de Chat deberá comunicar reintento manual sin prometer envío automático.

---

## 17. Decisiones aprobadas para este contrato

La aprobación cubre expresamente estas decisiones:

1. `guestDisplayName` y `stayReferenceText` son presentación frontend.
2. Solo existen autores `GUEST` y `RECEPTION`.
3. No hay timestamps porque Figma no los muestra.
4. `334:132` es la autoridad para el estado de envío exitoso.
5. No hay respuesta automática de Recepción después de cada envío.
6. El mensaje enviado se incorpora únicamente tras success.
7. `Nuevo mensaje` restablece el composer editable conservando el thread.
8. Error/offline conservan el draft para retry.
9. No se agregan features de mensajería avanzada.
10. `/chat` habilita únicamente la tab Chat adicionalmente a Services.

Como resultado de esta aprobación:

```text
IMP-AND-0104
PENDIENTE → READY
```

y podrá crearse una rama de implementación, por ejemplo:

```text
feature/android-chat
```
