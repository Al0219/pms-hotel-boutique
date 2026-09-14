import { router } from 'expo-router';
import { useReducer, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import { type RoomServiceService } from '@/modules/services/room-service/data/services/RoomServiceService';
import { calculateRoomServiceTotal, initialRoomServiceCart, roomServiceCartReducer, type RoomServiceCartState } from '@/modules/services/room-service/domain/models/RoomServiceCart';
import { roomServiceCategories, type RoomServiceCategory, type RoomServiceMenu, type RoomServiceMenuItem } from '@/modules/services/room-service/domain/models/RoomServiceMenu';
import { useRoomServiceMenu } from '@/modules/services/room-service/presentation/hooks/useRoomServiceMenu';
import { useSubmitRoomService } from '@/modules/services/room-service/presentation/hooks/useSubmitRoomService';
import { roomServiceStyles as styles } from '@/modules/services/room-service/presentation/roomServiceStyles';
import { type StayService } from '@/modules/stay';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { TimeWheelPicker } from '@/shared/components';
import { deriveRemoteState } from '@/state/remoteState';

export interface RoomServiceScreenProps {
  service?: RoomServiceService;
  stayService?: StayService;
}

function returnToServices() {
  router.dismissTo('/services');
}

function Button({ label, onPress, testID, disabled = false }: { label: string; onPress: () => void; testID: string; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, disabled && styles.buttonDisabled]} testID={testID}><Text style={styles.buttonLabel}>{label}</Text></Pressable>;
}

function StateCard({ title, body, testID, offline = false, success = false, onAction, actionLabel }: {
  title: string; body: string; testID: string; offline?: boolean; success?: boolean; onAction?: () => void; actionLabel?: string;
}) {
  return <View accessibilityLiveRegion="polite" style={[styles.stateCard, offline && styles.offlineStateCard, success && styles.successStateCard]} testID={testID}>
    <Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>
    {onAction && actionLabel ? <Button label={actionLabel} onPress={onAction} testID={`${testID}-action`} /> : null}
  </View>;
}

function QuantityStepper({ item, quantity, disabled, onDecrement, onIncrement }: {
  item: RoomServiceMenuItem; quantity: number; disabled: boolean; onDecrement: () => void; onIncrement: () => void;
}) {
  return <View style={styles.stepper}>
    <Pressable accessibilityLabel={`Disminuir cantidad de ${item.name}`} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onDecrement} style={styles.stepperButton} testID={`room-service-decrement-${item.fixtureKey}`}><Text style={styles.stepperLabel}>−</Text></Pressable>
    <Text accessibilityLabel={`Cantidad de ${item.name}: ${quantity}`} style={styles.quantity} testID={`room-service-quantity-${item.fixtureKey}`}>{quantity}</Text>
    <Pressable accessibilityLabel={`Aumentar cantidad de ${item.name}`} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onIncrement} style={styles.stepperButton} testID={`room-service-increment-${item.fixtureKey}`}><Text style={styles.stepperLabel}>+</Text></Pressable>
  </View>;
}

function ProductCard({ item, quantity, disabled, onAdd, onIncrement, onDecrement }: {
  item: RoomServiceMenuItem; quantity: number; disabled: boolean; onAdd: () => void; onIncrement: () => void; onDecrement: () => void;
}) {
  return <View style={styles.productCard} testID={`room-service-product-${item.fixtureKey}`}>
    <Text style={styles.productName}>{item.name}</Text>
    <Text style={styles.productPrice}>{`Q ${item.priceAmount}`}</Text>
    {quantity === 0 ? <Pressable accessibilityLabel={`Agregar ${item.name}`} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onAdd} style={[styles.productAction, disabled && styles.buttonDisabled]} testID={`room-service-add-${item.fixtureKey}`}><Text style={styles.productActionLabel}>Agregar</Text></Pressable> :
      <QuantityStepper disabled={disabled} item={item} onDecrement={onDecrement} onIncrement={onIncrement} quantity={quantity} />}
  </View>;
}

function CartPanel({ cart, deliveryTime, menu, notes, pending, submitError, submitOffline, onClose, onDecrement, onIncrement, onNotesChange, onOpenTimePicker, onRemove, onSubmit }: {
  cart: RoomServiceCartState;
  deliveryTime: string | null;
  menu: RoomServiceMenu;
  notes: string;
  pending: boolean;
  submitError: boolean;
  submitOffline: boolean;
  onClose: () => void;
  onDecrement: (itemFixtureKey: string) => void;
  onIncrement: (itemFixtureKey: string) => void;
  onNotesChange: (notes: string) => void;
  onOpenTimePicker: () => void;
  onRemove: (itemFixtureKey: string) => void;
  onSubmit: () => void;
}) {
  const total = calculateRoomServiceTotal(menu, cart);
  const submitDisabled = cart.items.length === 0 || deliveryTime === null || pending;

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible>
    <View style={styles.modalBackdrop}>
      <SafeAreaView edges={['bottom']} style={styles.modalSafeArea}>
        <View accessibilityViewIsModal style={styles.cartSheet} testID="room-service-cart-panel">
          <View style={styles.cartHeader}>
            <Text accessibilityRole="header" style={styles.cartTitle}>Tu pedido</Text>
            <Pressable accessibilityLabel="Cerrar carrito" accessibilityRole="button" onPress={onClose} style={styles.closeButton} testID="room-service-cart-close"><Text style={styles.closeLabel}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.cartContent} keyboardShouldPersistTaps="handled">
            {cart.items.length === 0 ? <Text style={styles.emptyCart}>Aún no has agregado productos.</Text> : cart.items.map((line) => {
              const item = menu.items.find((menuItem) => menuItem.fixtureKey === line.itemFixtureKey);
              return item ? <View key={line.itemFixtureKey} style={styles.cartLine} testID={`room-service-cart-line-${item.fixtureKey}`}>
                <View style={styles.cartLineInfo}><Text style={styles.productName}>{item.name}</Text><Text style={styles.productPrice}>{`Q ${item.priceAmount} × ${line.quantity}`}</Text></View>
                <QuantityStepper disabled={pending} item={item} onDecrement={() => onDecrement(item.fixtureKey)} onIncrement={() => onIncrement(item.fixtureKey)} quantity={line.quantity} />
                <Pressable accessibilityLabel={`Eliminar ${item.name} del pedido`} accessibilityRole="button" accessibilityState={{ disabled: pending }} disabled={pending}
                  onPress={() => onRemove(item.fixtureKey)} style={styles.removeButton} testID={`room-service-remove-${item.fixtureKey}`}><Text style={styles.removeLabel}>Eliminar</Text></Pressable>
              </View> : null;
            })}
            <View style={styles.totalSection}><Text style={styles.deliveryLabel}>Total</Text><Text style={styles.total} testID="room-service-total">{`Q ${total}`}</Text></View>
            <Text style={styles.productName}>Notas (opcional)</Text>
            <TextInput accessibilityLabel="Notas (opcional)" accessibilityState={{ disabled: pending }} editable={!pending} multiline onChangeText={onNotesChange}
              style={styles.notes} testID="room-service-notes" value={notes} />
            <Text style={styles.productName}>Entrega</Text>
            <Pressable accessibilityLabel="Seleccionar hora de entrega" accessibilityRole="button" accessibilityState={{ disabled: pending }} disabled={pending}
              onPress={onOpenTimePicker} style={styles.deliveryPicker} testID="room-service-delivery-picker">
              <Text style={[styles.deliveryValue, deliveryTime === null && styles.deliveryPlaceholder]}>{deliveryTime ?? 'Seleccionar hora'}</Text><Text accessible={false} style={styles.deliveryChevron}>⌄</Text>
            </Pressable>
            {submitError || submitOffline ? <StateCard body={submitOffline ? 'Conéctate a internet y reintenta tu pedido.' : 'Intenta nuevamente.'}
              offline={submitOffline} testID={submitOffline ? 'room-service-submit-offline' : 'room-service-submit-error'} title={submitOffline ? 'Sin conexión' : 'No pudimos enviar tu pedido'} /> : null}
            <Button disabled={submitDisabled} label={pending ? 'Enviando pedido...' : submitError || submitOffline ? 'Reintentar' : 'Confirmar pedido'} onPress={onSubmit} testID="room-service-submit" />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

/** Query owns menu state, Mutation owns submit state, and the cart is local UI configuration. */
export function RoomServiceScreen({ service, stayService }: RoomServiceScreenProps) {
  const menuQuery = useRoomServiceMenu(service);
  const menu = deriveRemoteState(menuQuery, () => false);
  const stayQuery = useCurrentStay(stayService);
  const stay = deriveRemoteState(stayQuery, () => false);
  const submission = useSubmitRoomService(service);
  const [category, setCategory] = useState<RoomServiceCategory>('Desayunos');
  const [cart, dispatch] = useReducer(roomServiceCartReducer, initialRoomServiceCart);
  const [notes, setNotes] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const inFlight = useRef(false);

  const submitOffline = submission.isError && submission.error instanceof NetworkError;
  const submitError = submission.isError && !submitOffline;
  const pending = submission.isPending;

  function submit() {
    if (menu.kind !== 'success' || stay.kind !== 'success' || cart.items.length === 0 || deliveryTime === null || pending || submission.isSuccess || inFlight.current) return;
    const trimmedNotes = notes.trim();
    inFlight.current = true;
    submission.mutate({ items: cart.items, deliveryTime, ...(trimmedNotes ? { notes: trimmedNotes } : {}) }, {
      onSettled: () => { inFlight.current = false; },
      onSuccess: () => { setCartVisible(false); },
    });
  }

  const canOpenCart = menu.kind === 'success' && stay.kind === 'success' && !pending;

  return <View style={styles.screen} testID="room-service-screen">
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}><View style={styles.header}>
      <Pressable accessibilityLabel="Volver a servicios" accessibilityRole="button" onPress={returnToServices}
        style={styles.headerButton} testID="room-service-back-arrow"><Text style={styles.backArrow}>←</Text></Pressable>
      <Text accessibilityRole="header" style={styles.headerTitle}>Room Service</Text>
      <Pressable accessibilityLabel="Abrir carrito" accessibilityRole="button" accessibilityState={{ disabled: !canOpenCart }} disabled={!canOpenCart}
        onPress={() => setCartVisible(true)} style={[styles.headerButton, !canOpenCart && styles.headerButtonDisabled]} testID="room-service-cart-button"><Text style={styles.cartIcon}>🛒</Text></Pressable>
    </View></SafeAreaView>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.scroll}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scroll}>
        {submission.isSuccess ? <StateCard actionLabel="Volver a servicios" body="Recibimos tu pedido de Room Service." onAction={returnToServices}
          success testID="room-service-submit-success" title="Pedido solicitado" /> :
          stay.kind === 'loading' ? <StateCard body="Espera un momento." testID="room-service-stay-loading" title="Cargando mi estadía" /> :
            stay.kind === 'offline' || stay.kind === 'error' ? <StateCard actionLabel="Reintentar"
              body={stay.kind === 'offline' ? 'Conéctate y reintenta para recuperar tu estadía.' : 'Reintenta para recuperar los datos de tu estadía.'}
              offline={stay.kind === 'offline'} onAction={() => void stayQuery.refetch()} testID={`room-service-stay-${stay.kind}`}
              title={stay.kind === 'offline' ? 'Mi estadía sin conexión' : 'No pudimos cargar tu estadía'} /> :
              stay.kind === 'empty' ? null : menu.kind === 'loading' ? <><Text style={styles.room}>{stay.data.room ? `Habitación ${stay.data.room.number}` : 'Habitación por asignar'}</Text><View testID="room-service-menu-loading"><Text style={styles.sectionTitle}>Cargando Room Service</Text><View style={styles.skeleton} /><View style={styles.skeleton} /></View></> :
                menu.kind === 'offline' || menu.kind === 'error' ? <StateCard actionLabel="Reintentar"
                  body={menu.kind === 'offline' ? 'Conéctate a internet para ver Room Service.' : 'Intenta nuevamente.'}
                  offline={menu.kind === 'offline'} onAction={() => void menuQuery.refetch()} testID={`room-service-menu-${menu.kind}`}
                  title={menu.kind === 'offline' ? 'Sin conexión' : 'No pudimos cargar Room Service'} /> :
                  menu.kind === 'success' ? (() => {
                    const visibleItems = menu.data.items.filter((item) => item.category === category);
                    return <>
                      <Text style={styles.room} testID="room-service-room">{stay.data.room ? `Habitación ${stay.data.room.number}` : 'Habitación por asignar'}</Text>
                      <Text accessibilityRole="header" style={styles.sectionTitle}>Categorías</Text>
                      <View accessibilityRole="tablist" style={styles.categoryList}>{roomServiceCategories.map((item) => <Pressable accessibilityLabel={item} accessibilityRole="tab"
                        accessibilityState={{ disabled: pending, selected: category === item }} disabled={pending} key={item} onPress={() => setCategory(item)}
                        style={[styles.categoryButton, category === item && styles.categoryButtonSelected]} testID={`room-service-category-${item}`}><Text style={styles.categoryLabel}>{item}</Text></Pressable>)}</View>
                      <Text accessibilityRole="header" style={styles.sectionTitle}>Catálogo</Text>
                      <View style={styles.catalog}>{visibleItems.map((item) => <ProductCard disabled={pending} item={item} key={item.fixtureKey}
                        quantity={cart.items.find((line) => line.itemFixtureKey === item.fixtureKey)?.quantity ?? 0}
                        onAdd={() => dispatch({ type: 'ADD_ITEM', itemFixtureKey: item.fixtureKey })}
                        onDecrement={() => dispatch({ type: 'DECREMENT_ITEM', itemFixtureKey: item.fixtureKey })}
                        onIncrement={() => dispatch({ type: 'INCREMENT_ITEM', itemFixtureKey: item.fixtureKey })} />)}</View>
                    </>;
                  })() : null}
      </ScrollView>
    </KeyboardAvoidingView>
    {cartVisible && menu.kind === 'success' ? <CartPanel cart={cart} deliveryTime={deliveryTime} menu={menu.data} notes={notes} pending={pending}
      submitError={submitError} submitOffline={submitOffline} onClose={() => setCartVisible(false)} onDecrement={(itemFixtureKey) => dispatch({ type: 'DECREMENT_ITEM', itemFixtureKey })}
      onIncrement={(itemFixtureKey) => dispatch({ type: 'INCREMENT_ITEM', itemFixtureKey })} onNotesChange={setNotes} onOpenTimePicker={() => setTimePickerVisible(true)}
      onRemove={(itemFixtureKey) => dispatch({ type: 'REMOVE_ITEM', itemFixtureKey })} onSubmit={submit} /> : null}
    <TimeWheelPicker mode="time" onCancel={() => setTimePickerVisible(false)} onConfirm={(value) => { setDeliveryTime(value); setTimePickerVisible(false); }}
      testID="room-service-delivery-time-picker" title="Elegir hora de entrega" value={deliveryTime ?? '00:00'} visible={timePickerVisible} />
    <GuestNavigationShell />
  </View>;
}
