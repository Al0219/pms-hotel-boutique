import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';

export type GuestFeatureIcon = ComponentProps<typeof SymbolView>['name'];

/** Shared presentation iconography for guest features and their launchers. */
export const guestFeatureIcons = {
  amenities: { android: 'redeem', ios: 'shippingbox.fill', web: 'redeem' },
  chat: { android: 'chat', ios: 'message.fill', web: 'chat' },
  cart: { android: 'shopping_cart', ios: 'cart.fill', web: 'shopping_cart' },
  chevronDown: { android: 'keyboard_arrow_down', ios: 'chevron.down', web: 'keyboard_arrow_down' },
  chevronLeft: { android: 'chevron_left', ios: 'chevron.backward', web: 'chevron_left' },
  chevronRight: { android: 'chevron_right', ios: 'chevron.forward', web: 'chevron_right' },
  checkout: { android: 'fact_check', ios: 'checkmark.circle.fill', web: 'fact_check' },
  housekeeping: { android: 'cleaning_services', ios: 'sparkles', web: 'cleaning_services' },
  home: { android: 'home', ios: 'house.fill', web: 'home' },
  hotel: { android: 'apartment', ios: 'building.2.fill', web: 'apartment' },
  invoice: { android: 'receipt_long', ios: 'doc.text.fill', web: 'receipt_long' },
  logout: { android: 'logout', ios: 'rectangle.portrait.and.arrow.right', web: 'logout' },
  passwordHidden: { android: 'visibility_off', ios: 'eye.slash', web: 'visibility_off' },
  passwordVisible: { android: 'visibility', ios: 'eye', web: 'visibility' },
  profile: { android: 'person', ios: 'person.fill', web: 'person' },
  promotions: { android: 'local_offer', ios: 'tag.fill', web: 'local_offer' },
  requests: { android: 'list', ios: 'list.bullet', web: 'list' },
  rewards: { android: 'star', ios: 'star.fill', web: 'star' },
  roomService: { android: 'restaurant', ios: 'fork.knife', web: 'restaurant' },
  services: { android: 'room_service', ios: 'bell.fill', web: 'room_service' },
  stay: { android: 'bed', ios: 'bed.double.fill', web: 'bed' },
  switchStay: { android: 'swap_horiz', ios: 'arrow.left.arrow.right', web: 'swap_horiz' },
  transfer: { android: 'airport_shuttle', ios: 'car.side.fill', web: 'airport_shuttle' },
  valet: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' },
  vehicle: { android: 'directions_car', ios: 'car.fill', web: 'directions_car' },
} as const satisfies Record<string, GuestFeatureIcon>;
