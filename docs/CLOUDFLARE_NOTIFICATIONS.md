# Especificación Técnica: Hub Serverless de Notificaciones en Tiempo Real (Cloudflare Worker + WebSockets)

Esta documentación define la arquitectura, contratos API y guía de integración para el hub de notificaciones en tiempo real del proyecto **PMS Hotel Boutique**, implementado mediante **Cloudflare Workers** y **Durable Objects**.

---

## 1. Arquitectura General

El servicio `cloudflare-gateway` actúa como un Gateway Serverless centralizado de notificaciones. Permite que el **Backend en Spring Boot** publique eventos de negocio mediante llamadas HTTP Webhook seguras, las cuales son retransmitidas de forma inmediata a todos los clientes web (Next.js) y móviles (Android) conectados mediante WebSockets persistentes.

```mermaid
sequenceDiagram
    autonumber
    participant SB as Spring Boot Backend
    participant CF as Cloudflare Worker (/api/webhook)
    participant DO as Durable Object (NotificationHub)
    participant WEB as Next.js Web App
    participant AND as Android Mobile App

    WEB->>DO: Conexión WebSocket (wss://.../ws)
    AND->>DO: Conexión WebSocket (wss://.../ws)
    Note over DO,AND: Conexiones activas registradas en el Hub

    SB->>CF: POST /api/webhook (Authorization: Bearer secret)
    CF->>CF: Validar secreto y formato JSON
    CF->>DO: Reenviar payload a /broadcast
    DO-->>WEB: Broadcast Evento JSON (Real-time)
    DO-->>AND: Broadcast Evento JSON (Real-time)
    DO-->>CF: Confirmación (clientsNotified: N)
    CF-->>SB: 200 OK { success: true, clientsNotified: N }
```

---

## 2. Contrato para Backend (Spring Boot)

El Backend Spring Boot debe invocar el endpoint Webhook del Worker cada vez que ocurra un evento relevante en el dominio (nuevas reservas, pedidos de room service, check-ins, mantenimientos, etc.).

### Endpoint y Autenticación
- **URL**: `POST https://<tu-worker-domain>.workers.dev/api/webhook`
- **Headers Obligatorios**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <WEBHOOK_SECRET>`

> **Nota de Seguridad**: Cualquier petición sin la cabecera `Authorization: Bearer <WEBHOOK_SECRET>` correcta será rechazada con estado HTTP `401 Unauthorized`.

### Estructura JSON del Payload (Request)

```json
{
  "id": "notif_1727730000000_abc123",
  "type": "NEW_RESERVATION",
  "title": "Nueva Reserva Confirmada #RES-9012",
  "message": "Reserva para Suite Presidencial por 3 noches registrada por Juan Pérez.",
  "reservationId": "RES-9012",
  "propertyId": "PROP-01",
  "timestamp": "2026-09-30T21:30:00.000Z",
  "metadata": {
    "guestName": "Juan Pérez",
    "roomNumber": "304",
    "totalAmount": 450.00
  }
}
```

### Campos del Payload
| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `String` | No | ID único del evento. Si se omite, el Worker genera uno automáticamente. |
| `type` | `String` | **Sí** | Tipo de evento de negocio (`NEW_RESERVATION`, `CHECK_IN`, `ROOM_SERVICE`, etc.). |
| `title` | `String` | **Sí** | Título breve legible para la notificación. |
| `message` | `String` | **Sí** | Mensaje descriptivo o cuerpo del aviso. |
| `reservationId` | `String` | No | ID de la reserva asociada (opcional). |
| `propertyId` | `String` | No | ID de la propiedad hotelera asociable (opcional). |
| `timestamp` | `String` (ISO 8601) | No | Timestamp de emisión del evento. Si se omite, el Worker asigna el tiempo actual. |
| `metadata` | `Object` | No | Mapa libre de metadatos adicionales (clave-valor). |

### Catálogo de Tipos de Eventos (`type`)
- `NEW_RESERVATION`: Nueva reserva creada en la plataforma.
- `RESERVATION_CANCEL`: Cancelación de una reserva existente.
- `CHECK_IN`: Check-in completado por recepción o vía web.
- `CHECK_OUT`: Check-out procesado.
- `ROOM_SERVICE`: Nuevo pedido o actualización de estado de Room Service.
- `MAINTENANCE`: Alerta o reporte de mantenimiento en habitación/área común.
- `HOUSEKEEPING`: Cambio de estado de limpieza de habitación.
- `SYSTEM`: Notificación general del sistema o mantenimiento programado.

### Respuestas del Servicio Webhook

#### 200 OK (Éxito)
```json
{
  "success": true,
  "clientsNotified": 4,
  "activeSockets": 4,
  "timestamp": "2026-09-30T21:30:00.123Z"
}
```

#### 401 Unauthorized (Error de token)
```json
{
  "error": "Unauthorized: Invalid Webhook Secret."
}
```

#### 400 Bad Request (Payload inválido)
```json
{
  "error": "Bad Request: Fields 'type', 'title', and 'message' are required."
}
```

---

### Ejemplo de Implementación en Java (Spring Boot)

```java
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.time.Instant;
import java.util.Map;

@Service
public class RealtimeNotificationService {

    private final RestClient restClient;
    private final String webhookSecret = System.getenv().getOrDefault("WEBHOOK_SECRET", "pms_secret_webhook_key_2026");
    private final String gatewayUrl = System.getenv().getOrDefault("NOTIFICATION_GATEWAY_URL", "https://pms-cloudflare-gateway.workers.dev/api/webhook");

    public RealtimeNotificationService() {
        this.restClient = RestClient.create();
    }

    public void notifyNewReservation(String reservationId, String guestName, String roomCategory) {
        var payload = Map.of(
            "type", "NEW_RESERVATION",
            "title", "Nueva Reserva #" + reservationId,
            "message", "Reserva confirmada para " + guestName + " (" + roomCategory + ").",
            "reservationId", reservationId,
            "propertyId", "PROP-01",
            "timestamp", Instant.now().toString(),
            "metadata", Map.of("guestName", guestName, "category", roomCategory)
        );

        try {
            var response = restClient.post()
                .uri(gatewayUrl)
                .header("Authorization", "Bearer " + webhookSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            System.out.println("Notificación enviada con éxito: " + response);
        } catch (Exception e) {
            System.err.println("Error enviando notificación al gateway: " + e.getMessage());
        }
    }
}
```

---

## 3. Contrato para Desarrollo Android (`pms-hotel-android`)

La aplicación Android debe establecer y mantener un socket abierto hacia el endpoint `/ws` del Worker.

### Endpoint WebSocket
- **URL Producción**: `wss://<tu-worker-domain>.workers.dev/ws`
- **URL Emulador Android (Dev Local)**: `ws://10.0.2.2:8787/ws`

### Protocolo de Mensajes Entrantes
Al conectarse o al transmitirse una notificación, la app Android recibirá un string JSON con la estructura:

```json
{
  "id": "notif_1727730000000_abc123",
  "type": "ROOM_SERVICE",
  "title": "Pedido Room Service #304",
  "message": "Desayuno continental solicitado para Habitación 304.",
  "reservationId": "RES-8910",
  "propertyId": "PROP-01",
  "timestamp": "2026-09-30T21:25:00.000Z",
  "metadata": {}
}
```

### Keep-Alive / Heartbeat Ping-Pong
Para evitar que las redes móviles cierren la conexión por inactividad, el cliente Android puede enviar el texto simple `"ping"` o `{"type":"PING"}` cada 30 segundos. El servidor responderá:

```json
{
  "type": "PONG",
  "timestamp": "2026-09-30T21:25:30.000Z"
}
```

---

### Ejemplo de Cliente WebSocket en Kotlin (Android / OkHttp)

```kotlin
package com.hotel.pms.notifications

import android.content.Context
import com.google.gson.Gson
import okhttp3.*
import java.util.concurrent.TimeUnit

data class NotificationPayload(
    val id: String?,
    val type: String,
    val title: String,
    val message: String,
    val reservationId: String?,
    val propertyId: String?,
    val timestamp: String?
)

class PMSNotificationManager(private val context: Context) {

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val gson = Gson()
    private val wsUrl = "wss://pms-cloudflare-gateway.workers.dev/ws"

    fun startListening() {
        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                println("Conectado al Hub de Notificaciones PMS")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    if (text.contains("PONG")) return
                    val notification = gson.fromJson(text, NotificationPayload::class.java)
                    showLocalAndroidNotification(notification)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                println("Error en conexión WebSocket: ${t.message}. Reintentando en 5s...")
                // Lógica de reconexión
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                println("Conexión WebSocket cerrada: $reason")
            }
        })
    }

    private fun showLocalAndroidNotification(notification: NotificationPayload) {
        // Código estándar de NotificationCompat.Builder para lanzar la notificación local en la barra de Android
        println("Lanzando Notificación Local Android: ${notification.title} - ${notification.message}")
    }

    fun stop() {
        webSocket?.close(1000, "App cerrada")
    }
}
```

---

## 4. Guía de Despliegue y Administración con Cloudflare Wrangler

### Prerrequisitos
- Node.js >= 18
- Cuenta de Cloudflare activa
- CLI de Wrangler instalado (`npm install -g wrangler` o mediante `npx wrangler`)

### Estructura del Proyecto Gateway
```text
cloudflare-gateway/
├── wrangler.toml
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### Ejecutar Servidor de Desarrollo Local
```bash
cd cloudflare-gateway
npm install
npm run dev
```
El worker local iniciará en `http://127.0.0.1:8787`, exponiendo `ws://127.0.0.1:8787/ws` y `http://127.0.0.1:8787/api/webhook`.

### Desplegar a Producción en Cloudflare
```bash
cd cloudflare-gateway
npx wrangler deploy
```

### Configurar Secreto de Webhook (`WEBHOOK_SECRET`)
Para no dejar la clave secreta expuesta en el repositorio de código, configúrala de forma segura en las variables encriptadas de Cloudflare:

```bash
npx wrangler secret put WEBHOOK_SECRET
```
*Se solicitará ingresar el secreto en la terminal (ejemplo: `pms_secret_prod_key_9988`).*

### Configurar Variables de Entorno en Next.js (`frontend/pms-hotel-web`)
En la aplicación web Next.js, añade la URL del worker en tu archivo `.env.local`:

```env
NEXT_PUBLIC_NOTIFICATION_WS_URL=wss://pms-cloudflare-gateway.<subdomain>.workers.dev/ws
```

---

## 5. Matriz de Verificación y Pruebas

| Prueba | Método | Resultado Esperado |
| :--- | :--- | :--- |
| **Health Check** | `GET /health` | Devuelve JSON con estado `UP` y endpoints disponibles. |
| **Seguridad Webhook** | `POST /api/webhook` sin Token | Devuelve `401 Unauthorized`. |
| **Notificación en Vivo** | `POST /api/webhook` con Token válido | Retransmite evento en milisegundos a todos los WebSockets Web/Android activos. |
| **Ping/Pong Heartbeat** | Enviar `"ping"` por WebSocket | Servidor responde `{"type":"PONG", ...}` manteniendo el socket con vida. |
| **Reconexión Web** | Desconectar Wi-Fi / Red | Hook `useNotifications` detecta caída y reintenta automáticamente con backoff exponencial. |
