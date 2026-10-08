# 40 — Universal States Implementation Contract

**Tarea:** `IMP-AND-0401 — Universal States`  
**Estado:** `EN_QA` tras QA automática; pendiente revisión manual y WEB-2.  
**Referencia visual general:** `238:132 — Implementation Ready — Android V2 + V3`.

## Objetivo

`UniversalState` establece una base de presentación reutilizable para los estados `loading`, `error`, `empty` y `offline`. Su intención es reducir la duplicación actual de StateCards y loadings locales sin migrar pantallas existentes en esta tarea.

## API pública

~~~ts
type UniversalStateKind = 'loading' | 'error' | 'empty' | 'offline';

interface UniversalStateAction {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

<UniversalState
  kind="offline"
  title="Servicios sin conexión"
  body="Conéctate y reintenta."
  retry={{ label: 'Reintentar', onPress: () => void query.refetch() }}
/>
~~~

Todos los estados reciben `title`, `body?`, `testID?` y `accessibilityLabel?`. Error y Offline aceptan `retry?`; Empty acepta `action?`; Loading no admite acción. El componente no fija textos de negocio ni asume que Empty sea un error.

## Responsabilidades y límites

Es un componente exclusivamente de presentación. No conoce ReservationStay, sesión, contexto activo, Checkout, servicios, Chat, Rewards, Promotions, queries, mutations, DTOs, fixtures, endpoints, navegación ni reglas de negocio. La feature dueña elige copy y decide qué callback inyectar.

No importa TanStack Query, no observa conectividad, no ejecuta reintentos, no persiste datos y no monta header, drawer, footbar ni Safe Area. Puede montarse dentro de ScrollView o de un body flexible sin asumir dimensiones, posición absoluta ni alturas fijas.

## Accesibilidad y retry

El contenedor anuncia cambios mediante `accessibilityLiveRegion="polite"`; el título es heading y Loading expone ActivityIndicator con estado `busy`. Las acciones declaradas usan rol button, label accesible y estado disabled. Offline es una variante explícita y se distingue por el título/copy proporcionados por la feature, además del token visual correspondiente.

`retry` y `action` se delegan una sola vez mediante el callback inyectado. La feature conserva la responsabilidad de `query.refetch()`, retry de mutation u otra acción aprobada.

## Tokens

Reutiliza exclusivamente `tokens.color`, `tokens.space`, `tokens.radius`, `tokens.typography` y `tokens.layout` existentes. No se añadieron colores, dependencias ni iconos nuevos. Loading usa `ActivityIndicator` nativo; no se creó un skeleton universal que imponga la composición de una feature.

## Relación con RemoteState e IMP-AND-0402

`deriveRemoteState` permanece como clasificación técnica de query en `src/state/remoteState.ts`; `UniversalState` no la importa ni la traduce. Un consumidor futuro puede mapear su estado local/RemoteState a props visuales sin acoplar esta foundation a TanStack Query.

`IMP-AND-0402` decidirá y validará la migración de consumidores existentes. Esta tarea no eliminó StateCards locales, no modificó journeys productivos ni adelantó estados universales de feature.

## Pruebas y DoD

`tests/universal-state.test.tsx` cubre Loading accesible, Error con/sin retry, Offline explícito con retry, Empty sin acción y Empty con acción accesible. La QA automática exige suite completa sin fallos, typecheck, lint, diff-check, Expo Doctor y export Android. No se afirma paridad Figma pixel-perfect: la revisión visual manual permanece pendiente.
