import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { accountStayHubStyles } from '@/modules/account/presentation/accountStayHubStyles';
import { GuestNavigationShell } from '@/modules/navigation';
import { filterServiceRequests, SessionServiceRequestCard, sessionServiceRequestEditPath, useCompleteSessionServiceRequest, useSessionServiceRequests } from '@/modules/service-requests';
import { type StayService } from '@/modules/stay/data/services/StayService';
import { useCurrentStay } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { deriveRemoteState } from '@/state/remoteState';

export interface AccountStayHubScreenProps {
  service?: StayService;
}

function formatStayDate(value: string): string {
  return new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '');
}

function AccountStateCard({
  body,
  offline = false,
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
      style={[accountStayHubStyles.stateCard, offline && accountStayHubStyles.offlineStateCard]}
      testID={testID}
    >
      <Text style={accountStayHubStyles.stateTitle}>{title}</Text>
      <Text style={accountStayHubStyles.stateBody}>{body}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={accountStayHubStyles.button}>
          <Text style={accountStayHubStyles.buttonLabel}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AccountStayLoading() {
  return (
    <View style={[accountStayHubStyles.content, accountStayHubStyles.stateContent]} testID="account-stay-loading">
      <Text style={accountStayHubStyles.title}>Cargando mi estadía</Text>
      <View style={accountStayHubStyles.skeleton} />
      <View style={accountStayHubStyles.skeleton} />
    </View>
  );
}

/** V3 Account composition over the existing ReservationStay query boundary. */
export function AccountStayHubScreen({ service }: AccountStayHubScreenProps) {
  const query = useCurrentStay(service);
  const remoteState = deriveRemoteState(query, () => false);
  const { removeRequest, requests } = useSessionServiceRequests();
  const completeSessionRequest = useCompleteSessionServiceRequest();
  const [nowMs] = useState(() => Date.now());
  const activeRequests = filterServiceRequests(requests, 'ACTIVE');

  if (remoteState.kind === 'loading') {
    return (
      <View style={accountStayHubStyles.screen}>
        <AccountStayLoading />
        <GuestNavigationShell />
      </View>
    );
  }

  if (remoteState.kind === 'offline') {
    return (
      <View style={accountStayHubStyles.screen}>
        <View style={[accountStayHubStyles.content, accountStayHubStyles.stateContent]}>
          <AccountStateCard
            body="Conéctate y reintenta para recuperar tu estadía."
            offline
            onRetry={() => void query.refetch()}
            testID="account-stay-offline"
            title="Mi estadía sin conexión"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  if (remoteState.kind === 'error') {
    return (
      <View style={accountStayHubStyles.screen}>
        <View style={[accountStayHubStyles.content, accountStayHubStyles.stateContent]}>
          <AccountStateCard
            body="Reintenta para recuperar los datos de tu estadía."
            onRetry={() => void query.refetch()}
            testID="account-stay-error"
            title="No pudimos cargar tu estadía"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  // Empty is not an approved Account / Stay Hub experience in IMP-AND-0109.
  if (remoteState.kind === 'empty') return null;

  const stay = remoteState.data;
  const roomText = stay.room ? `Habitación ${stay.room.number}` : 'Habitación por asignar';
  const stayDates = `${formatStayDate(stay.arrival)}–${formatStayDate(stay.departure)}`;

  return (
    <View style={accountStayHubStyles.screen} testID="account-stay-hub-screen">
      <ScrollView contentContainerStyle={accountStayHubStyles.content} style={accountStayHubStyles.scroll}>
        <Text style={accountStayHubStyles.title}>Mi estadía</Text>
        <Text style={accountStayHubStyles.subtitle}>Tu reserva vinculada</Text>
        <View style={accountStayHubStyles.stayCard}>
          <Text style={accountStayHubStyles.stayCardEyebrow}>{roomText}</Text>
          <Text style={accountStayHubStyles.stayCardTitle}>{stay.roomType.name}</Text>
          <Text style={accountStayHubStyles.stayCardBody}>{stayDates}</Text>
          <Text style={accountStayHubStyles.stayCardBody}>{`Check-out · ${formatStayDate(stay.departure)}`}</Text>
          <View style={accountStayHubStyles.reference}>
            <Text style={accountStayHubStyles.referenceText}>{stay.reservationId}</Text>
          </View>
        </View>
        <View style={accountStayHubStyles.requestsSection} testID="account-session-requests">
          <Text accessibilityRole="header" style={accountStayHubStyles.sectionTitle}>Mis servicios</Text>
          {activeRequests.length === 0 ? <Text style={accountStayHubStyles.subtitle}>Aún no tienes servicios solicitados.</Text> : activeRequests.slice(0, 3).map((request) => <SessionServiceRequestCard key={request.sessionRequestId} nowMs={nowMs} onComplete={completeSessionRequest} onRemove={removeRequest} onEdit={(item) => {
            const target = sessionServiceRequestEditPath(item);
            router.push({ pathname: target, params: { editRequestId: item.sessionRequestId, editMode: item.kind, returnTo: 'account' } });
          }} request={request} />)}
          {requests.length > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push('/services/requests')} style={accountStayHubStyles.button} testID="account-session-requests-all"><Text style={accountStayHubStyles.buttonLabel}>Ver todos</Text></Pressable> : null}
        </View>
      </ScrollView>
      <GuestNavigationShell />
    </View>
  );
}
