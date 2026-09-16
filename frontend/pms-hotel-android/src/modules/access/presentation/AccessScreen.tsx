import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type AccessService } from '@/modules/access/data/services/AccessService';
import { ReservationNotFoundError } from '@/modules/access/domain/errors/ReservationNotFoundError';
import { type ReservationAccessRequest } from '@/modules/access/domain/models/ReservationAccess';
import { accessStyles } from '@/modules/access/presentation/accessStyles';
import { useLinkReservation } from '@/modules/access/presentation/hooks/useLinkReservation';

type FieldErrors = Partial<Record<keyof ReservationAccessRequest, string>>;

export interface AccessScreenProps {
  service?: AccessService;
  onLinked?: () => void;
}

function validate(request: ReservationAccessRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (!request.reservationCode) errors.reservationCode = 'Ingresa tu código de reserva.';
  if (!request.email) errors.email = 'Ingresa tu correo electrónico.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) errors.email = 'Ingresa un correo electrónico válido.';
  return errors;
}

function AccessStateCard({
  body,
  onRetry,
  testID,
  title,
}: {
  body: string;
  onRetry?: () => void;
  testID: string;
  title: string;
}) {
  return (
    <View style={[accessStyles.stateCard, testID === 'access-offline' && accessStyles.offlineStateCard]} testID={testID}>
      <Text style={accessStyles.stateTitle}>{title}</Text>
      <Text style={accessStyles.stateBody}>{body}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={accessStyles.button}>
          <Text style={accessStyles.buttonLabel}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Access is intentionally outside GuestNavigationShell until a link succeeds. */
export function AccessScreen({ service, onLinked = () => router.replace('/account') }: AccessScreenProps) {
  const linkReservation = useLinkReservation(service);
  const inFlight = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [reservationCode, setReservationCode] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const request = (): ReservationAccessRequest => ({
    email: email.trim(),
    reservationCode: reservationCode.trim(),
  });

  function changeReservationCode(value: string): void {
    setReservationCode(value);
    if (fieldErrors.reservationCode) setFieldErrors((current) => ({ ...current, reservationCode: undefined }));
  }

  function changeEmail(value: string): void {
    setEmail(value);
    if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
  }

  function submit(): void {
    const nextRequest = request();
    const errors = validate(nextRequest);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || linkReservation.isPending || inFlight.current) return;

    inFlight.current = true;
    linkReservation.mutate(nextRequest, {
      onSuccess: onLinked,
      onSettled: () => { inFlight.current = false; },
    });
  }

  function keepFormReachable(): void {
    // Lets Android resize for the keyboard before the scroll position is calculated.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  const isOffline = linkReservation.isError && linkReservation.error instanceof NetworkError;
  const isNotFound = linkReservation.isError && linkReservation.error instanceof ReservationNotFoundError;
  const isGenericError = linkReservation.isError && !isOffline && !isNotFound;
  const isPending = linkReservation.isPending;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={accessStyles.screen}>
      <ScrollView
        contentContainerStyle={accessStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        style={accessStyles.scroll}
      >
        <View style={accessStyles.form} testID="access-screen">
          <Text style={accessStyles.title}>Vincula tu reserva</Text>
          <Text style={accessStyles.subtitle}>Ingresa los datos de tu reserva para continuar.</Text>
          <View style={accessStyles.field}>
            <Text nativeID="access-reservation-code-label" style={accessStyles.label}>Código de reserva</Text>
            <TextInput
              accessibilityHint={fieldErrors.reservationCode}
              accessibilityLabel="Código de reserva"
              accessibilityState={{ disabled: isPending }}
              editable={!isPending}
              maxLength={32}
              onChangeText={changeReservationCode}
              onFocus={keepFormReachable}
              style={[accessStyles.input, fieldErrors.reservationCode && accessStyles.inputInvalid]}
              testID="access-reservation-code"
              value={reservationCode}
            />
            {fieldErrors.reservationCode ? <Text accessibilityLiveRegion="polite" style={accessStyles.fieldError}>{fieldErrors.reservationCode}</Text> : null}
          </View>
          <View style={accessStyles.field}>
            <Text nativeID="access-email-label" style={accessStyles.label}>Correo electrónico</Text>
            <TextInput
              accessibilityHint={fieldErrors.email}
              accessibilityLabel="Correo electrónico"
              accessibilityState={{ disabled: isPending }}
              autoCapitalize="none"
              editable={!isPending}
              keyboardType="email-address"
              maxLength={254}
              onChangeText={changeEmail}
              onFocus={keepFormReachable}
              style={[accessStyles.input, fieldErrors.email && accessStyles.inputInvalid]}
              testID="access-email"
              value={email}
            />
            {fieldErrors.email ? <Text accessibilityLiveRegion="polite" style={accessStyles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>
          {isNotFound ? (
            <AccessStateCard
              body="Revisa el código de reserva y el correo e inténtalo de nuevo."
              testID="access-verification-failed"
              title="No pudimos verificar los datos"
            />
          ) : null}
          {isGenericError ? <AccessStateCard body="Intenta nuevamente." onRetry={submit} testID="access-error" title="No pudimos vincular tu reserva" /> : null}
          {isOffline ? <AccessStateCard body="Conéctate a internet para vincular tu reserva." onRetry={submit} testID="access-offline" title="Sin conexión" /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={submit}
            style={[accessStyles.button, isPending && accessStyles.buttonDisabled]}
            testID="access-submit-button"
          >
            <Text style={accessStyles.buttonLabel}>{isPending ? 'Vinculando...' : 'Vincular reserva'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
