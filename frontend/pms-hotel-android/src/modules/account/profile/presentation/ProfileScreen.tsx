import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { type AccountProfileService } from '@/modules/account/profile/data/services/AccountProfileService';
import { type AccountProfileUpdateInput } from '@/modules/account/profile/domain/AccountProfile';
import { GuestChildHeader } from '@/modules/navigation';
import { tokens } from '@/shared/theme/tokens';
import { deriveRemoteState } from '@/state/remoteState';

import { useAccountProfile, useUpdateAccountProfile } from './hooks/useAccountProfile';

export interface ProfileScreenProps {
  service?: AccountProfileService;
}

type Draft = AccountProfileUpdateInput;

const fields = [
  ['languageText', 'Idioma'],
  ['bedPreferenceText', 'Cama'],
  ['roomPreferenceText', 'Habitación'],
  ['floorPreferenceText', 'Piso'],
  ['avoidPreferenceText', 'Evitar'],
] as const;

function draftOf(data: { account: { marketingSmsConsent: Draft['marketingSmsConsent'] }; profile: Draft['profile'] }): Draft {
  return { marketingSmsConsent: data.account.marketingSmsConsent, profile: { ...data.profile } };
}

function equal(a: Draft, b: Draft) {
  return a.marketingSmsConsent === b.marketingSmsConsent
    && fields.every(([field]) => a.profile[field] === b.profile[field]);
}

function RetryCard({ offline, onRetry, title }: { offline?: boolean; onRetry: () => void; title: string }) {
  return (
    <View style={[styles.card, offline && styles.offline]} testID={offline ? 'profile-offline' : 'profile-error'}>
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <Text style={styles.body}>Reintenta para recuperar o guardar tus datos y preferencias.</Text>
      <Pressable accessibilityLabel="Reintentar Perfil" accessibilityRole="button" onPress={onRetry} style={styles.button} testID="profile-retry">
        <Text style={styles.buttonText}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

export function ProfileScreen({ service }: ProfileScreenProps) {
  const query = useAccountProfile(service);
  const mutation = useUpdateAccountProfile(service);
  const state = deriveRemoteState(query, () => false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [discard, setDiscard] = useState(false);
  const [success, setSuccess] = useState(false);
  const submittingRef = useRef(false);
  const confirmed = state.kind === 'success' ? draftOf(state.data) : null;
  const active = draft ?? confirmed;
  const dirty = Boolean(active && confirmed && !equal(active, confirmed));

  const leave = () => router.dismissTo('/account');
  const back = () => {
    if (dirty) setDiscard(true);
    else leave();
  };

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => listener.remove();
  });

  const save = () => {
    if (!active || !dirty || mutation.isPending || submittingRef.current) return;

    submittingRef.current = true;
    mutation.mutate(active, {
      onSuccess: (result) => {
        setDraft(draftOf(result));
        setSuccess(true);
      },
      onSettled: () => {
        submittingRef.current = false;
      },
    });
  };

  const update = (field: keyof Draft['profile'], value: string) => {
    if (!active) return;
    setSuccess(false);
    setDraft({ ...active, profile: { ...active.profile, [field]: value } });
  };

  const updateMarketingSms = (value: boolean) => {
    if (!active) return;
    setSuccess(false);
    setDraft({ ...active, marketingSmsConsent: value ? 'consented' : 'revoked' });
  };

  const offline = mutation.error instanceof NetworkError;

  return (
    <View style={styles.screen} testID="profile-screen">
      <GuestChildHeader backAccessibilityLabel="Volver a mi cuenta" backTestID="profile-back" onBack={back} title="Perfil" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {state.kind === 'loading' ? (
            <View style={styles.card} testID="profile-loading">
              <Text accessibilityRole="header" style={styles.heading}>Cargando Perfil</Text>
              <Text style={styles.body}>Estamos recuperando datos y preferencias…</Text>
            </View>
          ) : null}
          {state.kind === 'error' ? <RetryCard onRetry={() => void query.refetch()} title="Error en Perfil" /> : null}
          {state.kind === 'offline' ? <RetryCard offline onRetry={() => void query.refetch()} title="Perfil sin conexión" /> : null}
          {state.kind === 'success' && active ? (
            <>
              <View style={styles.card} testID="profile-identity">
                <Text accessibilityRole="header" style={styles.heading}>Información personal</Text>
                <Text style={styles.body}>Estos datos son informativos.</Text>
                <Text style={styles.label}>Nombre</Text>
                <Text style={styles.value}>{state.data.account.displayName}</Text>
                <Text style={styles.label}>Correo</Text>
                <Text style={styles.value}>{state.data.account.emailText}</Text>
                <Text style={styles.label}>Teléfono</Text>
                <Text style={styles.value}>{state.data.account.phoneText}</Text>
              </View>
              <View style={styles.card} testID="profile-preferences">
                <Text accessibilityRole="header" style={styles.heading}>Preferencias de estancia</Text>
                {fields.map(([field, label]) => (
                  <View key={field} style={styles.field}>
                    <Text style={styles.label}>{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      editable={!mutation.isPending}
                      onChangeText={(value) => update(field, value)}
                      style={styles.input}
                      testID={`profile-input-${field}`}
                      value={active.profile[field]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.card} testID="profile-communications">
                <Text accessibilityRole="header" style={styles.heading}>Privacidad y comunicaciones</Text>
                <Text style={styles.label}>Privacidad</Text>
                <Text style={styles.value}>{state.data.account.privacyText}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Marketing SMS</Text>
                  <Switch
                    accessibilityLabel="Marketing SMS"
                    accessibilityRole="switch"
                    accessibilityState={{ checked: active.marketingSmsConsent === 'consented', disabled: mutation.isPending }}
                    disabled={mutation.isPending}
                    onValueChange={updateMarketingSms}
                    testID="profile-marketing-sms"
                    value={active.marketingSmsConsent === 'consented'}
                  />
                </View>
              </View>
              {mutation.isError ? <RetryCard offline={offline} onRetry={save} title={offline ? 'Perfil sin conexión' : 'No pudimos guardar'} /> : null}
              {success ? (
                <View style={styles.success} testID="profile-success">
                  <Text accessibilityRole="header" style={styles.successTitle}>Cambios guardados</Text>
                  <Text style={styles.body}>{mutation.data?.confirmationText}</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityLabel="Guardar cambios"
                accessibilityRole="button"
                accessibilityState={{ disabled: !dirty || mutation.isPending, busy: mutation.isPending }}
                disabled={!dirty || mutation.isPending}
                onPress={save}
                style={[styles.button, (!dirty || mutation.isPending) && styles.disabled]}
                testID="profile-save"
              >
                <Text style={styles.buttonText}>{mutation.isPending ? 'Guardando cambios…' : 'Guardar cambios'}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal transparent visible={discard} onRequestClose={() => setDiscard(false)}>
        <View style={styles.backdrop}>
          <View pointerEvents="none" style={styles.backdropTint} testID="profile-unsaved-backdrop" />
          <View accessibilityViewIsModal style={styles.modal} testID="profile-unsaved-dialog">
            <Text accessibilityRole="header" style={styles.heading}>¿Descartar cambios?</Text>
            <Text style={styles.body}>Tus cambios sin guardar se perderán.</Text>
            <Pressable accessibilityLabel="Descartar cambios" accessibilityRole="button" onPress={leave} style={styles.button} testID="profile-discard">
              <Text style={styles.buttonText}>Descartar cambios</Text>
            </Pressable>
            <Pressable accessibilityLabel="Continuar editando" accessibilityRole="button" onPress={() => setDiscard(false)} style={styles.secondary} testID="profile-continue-editing">
              <Text style={styles.secondaryText}>Continuar editando</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.surface },
  flex: { flex: 1 },
  content: { padding: tokens.layout.screenInset, gap: tokens.space.md },
  card: { backgroundColor: tokens.color.white, borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm },
  offline: { backgroundColor: tokens.color.pendingSurface },
  heading: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.sectionTitle, fontWeight: '600' },
  body: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  label: { color: tokens.color.muted, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.bodyMedium },
  value: { color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label },
  field: { gap: tokens.space.xs },
  input: { borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.control, minHeight: tokens.layout.controlHeight, paddingHorizontal: tokens.space.sm, color: tokens.color.inkStrong, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: tokens.color.border, paddingTop: tokens.space.sm },
  button: { minHeight: tokens.layout.buttonHeight, justifyContent: 'center', alignItems: 'center', borderRadius: tokens.radius.control, backgroundColor: tokens.color.brand, paddingHorizontal: tokens.space.md },
  disabled: { backgroundColor: tokens.color.border },
  buttonText: { color: tokens.color.white, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  success: { backgroundColor: tokens.color.surfaceAccent, borderColor: tokens.color.brandSoft, borderWidth: 1, borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.xs },
  successTitle: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'center', padding: tokens.layout.screenInset },
  backdropTint: { ...StyleSheet.absoluteFill, backgroundColor: tokens.color.inkStrong, opacity: 0.12 },
  modal: { backgroundColor: tokens.color.white, borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.md },
  secondary: { minHeight: tokens.layout.buttonHeight, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.control, borderWidth: 1, borderColor: tokens.color.brandSoft },
  secondaryText: { color: tokens.color.brand, fontFamily: tokens.typography.family, fontSize: tokens.typography.size.label, fontWeight: '600' },
});
