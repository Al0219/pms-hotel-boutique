import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { NetworkError } from "@/data/remote/http/HttpError";
import { type GuestAuthService } from "@/modules/guest-auth/data/services/GuestAuthService";
import { InvalidGuestCredentialsError } from "@/modules/guest-auth/domain/errors/InvalidGuestCredentialsError";
import { type GuestAuthSession } from "@/modules/guest-auth/domain/models/GuestAuthSession";
import { type GuestLoginRequest } from "@/modules/guest-auth/domain/models/GuestLoginRequest";
import { useActiveReservationContext } from "@/modules/guest-auth/presentation/ActiveReservationContextProvider";
import { useGuestAuthSession } from "@/modules/guest-auth/presentation/GuestAuthSessionProvider";
import { guestFeatureIcons } from "@/modules/navigation/guestFeatureIcons";
import { tokens } from "@/shared/theme/tokens";

import { useGuestLogin } from "./hooks/useGuestLogin";
import { loginStyles } from "./loginStyles";

interface FieldErrors {
  email?: string;
  password?: string;
}

export interface LoginScreenProps {
  service?: GuestAuthService;
  onAuthenticated?: (session: GuestAuthSession) => void;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(request: GuestLoginRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (!request.email) errors.email = "Ingresa tu correo electrónico.";
  else if (!isEmail(request.email))
    errors.email = "Ingresa un correo electrónico válido.";
  if (!request.password) errors.password = "Ingresa tu contraseña.";
  return errors;
}

function LoginStateCard({
  body,
  offline,
  onRetry,
  testID,
  title,
}: {
  body: string;
  offline?: boolean;
  onRetry?: () => void;
  testID: string;
  title: string;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[loginStyles.stateCard, offline && loginStyles.offlineStateCard]}
      testID={testID}
    >
      <Text accessibilityRole="header" style={loginStyles.stateTitle}>
        {title}
      </Text>
      <Text style={loginStyles.stateBody}>{body}</Text>
      {onRetry ? (
        <Pressable
          accessibilityLabel="Reintentar inicio de sesión"
          accessibilityRole="button"
          onPress={onRetry}
          style={loginStyles.secondaryAction}
          testID={`${testID}-retry`}
        >
          <Text style={loginStyles.secondaryActionLabel}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Login establishes only the account session; /reservations owns the 0/1/N stay decision. */
export function LoginScreen({ onAuthenticated, service }: LoginScreenProps) {
  const { clearActiveReservationContext } = useActiveReservationContext();
  const { beginSession } = useGuestAuthSession();
  const login = useGuestLogin(service);
  const inFlight = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const request = (): GuestLoginRequest => ({ email: email.trim(), password });
  const isPending = login.isPending;
  const invalidCredentials =
    login.isError && login.error instanceof InvalidGuestCredentialsError;
  const offline = login.isError && login.error instanceof NetworkError;
  const genericError = login.isError && !invalidCredentials && !offline;

  function clearRemoteError(): void {
    if (login.isError) login.reset();
  }

  function changeEmail(value: string): void {
    setEmail(value);
    clearRemoteError();
    if (fieldErrors.email)
      setFieldErrors((current) => ({ ...current, email: undefined }));
  }

  function changePassword(value: string): void {
    setPassword(value);
    clearRemoteError();
    if (fieldErrors.password)
      setFieldErrors((current) => ({ ...current, password: undefined }));
  }

  function keepFormReachable(): void {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  }

  function onSuccess(session: GuestAuthSession): void {
    clearActiveReservationContext();
    beginSession(session);
    if (onAuthenticated) onAuthenticated(session);
    else router.replace("/reservations");
  }

  function submit(): void {
    const nextRequest = request();
    const errors = validate(nextRequest);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || isPending || inFlight.current) return;

    inFlight.current = true;
    login.submit(nextRequest, {
      onSuccess,
      onSettled: () => {
        inFlight.current = false;
      },
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={loginStyles.screen}
    >
      <ScrollView
        contentContainerStyle={loginStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        style={loginStyles.scroll}
      >
        <View style={loginStyles.card} testID="guest-login-screen">
          <Text style={loginStyles.brand}>Hotel Boutique</Text>
          <View style={loginStyles.heading}>
            <Text accessibilityRole="header" style={loginStyles.title}>
              Inicia sesión
            </Text>
            <Text style={loginStyles.subtitle}>
              Accede a tu cuenta para continuar.
            </Text>
          </View>
          <View style={loginStyles.field}>
            <Text nativeID="guest-login-email-label" style={loginStyles.label}>
              Correo electrónico
            </Text>
            <TextInput
              accessibilityHint={fieldErrors.email}
              accessibilityLabel="Correo electrónico"
              accessibilityState={{ disabled: isPending }}
              autoCapitalize="none"
              autoComplete="email"
              editable={!isPending}
              keyboardType="email-address"
              maxLength={254}
              placeholder="nombre@correo.com"
              placeholderTextColor={tokens.color.muted}
              onChangeText={changeEmail}
              onFocus={keepFormReachable}
              style={[
                loginStyles.input,
                fieldErrors.email && loginStyles.inputInvalid,
              ]}
              testID="guest-login-email"
              value={email}
            />
            {fieldErrors.email ? (
              <Text
                accessibilityLiveRegion="polite"
                style={loginStyles.fieldError}
              >
                {fieldErrors.email}
              </Text>
            ) : null}
          </View>
          <View style={[loginStyles.field, loginStyles.passwordField]}>
            <Text
              nativeID="guest-login-password-label"
              style={loginStyles.label}
            >
              Contraseña
            </Text>
            <View
              style={loginStyles.passwordControl}
              testID="guest-login-password-control"
            >
              <TextInput
                accessibilityHint={fieldErrors.password}
                accessibilityLabel="Contraseña"
                accessibilityState={{ disabled: isPending }}
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!isPending}
                onChangeText={changePassword}
                onFocus={keepFormReachable}
                secureTextEntry={!showPassword}
                style={[
                  loginStyles.input,
                  loginStyles.passwordInput,
                  fieldErrors.password && loginStyles.inputInvalid,
                ]}
                testID="guest-login-password"
                value={password}
              />
              <Pressable
                accessibilityLabel={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                accessibilityRole="button"
                accessibilityState={{ disabled: isPending }}
                disabled={isPending}
                onPress={() => setShowPassword((visible) => !visible)}
                style={loginStyles.passwordToggle}
                testID="guest-login-password-toggle"
              >
                <View
                  accessible={false}
                  testID="guest-login-password-toggle-icon"
                >
                  <SymbolView
                    accessibilityElementsHidden
                    name={
                      showPassword
                        ? guestFeatureIcons.passwordVisible
                        : guestFeatureIcons.passwordHidden
                    }
                    size={tokens.typography.size.sectionTitle}
                    tintColor={tokens.color.brand}
                  />
                </View>
              </Pressable>
            </View>
            {fieldErrors.password ? (
              <Text
                accessibilityLiveRegion="polite"
                style={loginStyles.fieldError}
              >
                {fieldErrors.password}
              </Text>
            ) : null}
          </View>
          {invalidCredentials ? (
            <LoginStateCard
              body="Revisa tus datos e inténtalo de nuevo."
              testID="guest-login-invalid-credentials"
              title="No pudimos iniciar sesión"
            />
          ) : null}
          {genericError ? (
            <LoginStateCard
              body="Inténtalo nuevamente."
              onRetry={submit}
              testID="guest-login-error"
              title="No pudimos iniciar sesión"
            />
          ) : null}
          {offline ? (
            <LoginStateCard
              body="Conéctate a internet e inténtalo de nuevo."
              offline
              onRetry={submit}
              testID="guest-login-offline"
              title="Sin conexión"
            />
          ) : null}
          <Pressable
            accessibilityLabel="Iniciar sesión"
            accessibilityRole="button"
            accessibilityState={{ busy: isPending, disabled: isPending }}
            disabled={isPending}
            onPress={submit}
            style={[
              loginStyles.button,
              isPending && loginStyles.buttonDisabled,
            ]}
            testID="guest-login-submit"
          >
            <Text style={loginStyles.buttonLabel}>
              {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Acceder a una estadía"
            accessibilityRole="button"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={() => router.push("/access")}
            style={[
              loginStyles.secondaryAction,
              isPending && loginStyles.secondaryActionDisabled,
            ]}
            testID="guest-login-access"
          >
            <Text style={loginStyles.secondaryActionLabel}>
              Acceder a una estadía
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
