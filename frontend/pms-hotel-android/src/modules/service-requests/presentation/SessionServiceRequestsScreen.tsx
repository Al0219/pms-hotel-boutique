import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GuestChildHeader, GuestNavigationShell } from '@/modules/navigation';
import { filterServiceRequests, serviceRequestFilters, type ServiceRequestFilter } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { SessionServiceRequestCard, sessionServiceRequestEditPath } from '@/modules/service-requests/presentation/SessionServiceRequestCard';
import { useCompleteSessionServiceRequest } from '@/modules/service-requests/presentation/useCompleteSessionServiceRequest';
import { useSessionServiceRequests } from '@/modules/service-requests/presentation/SessionServiceRequestsProvider';
import { sessionServiceRequestStyles as styles } from '@/modules/service-requests/presentation/sessionServiceRequestStyles';

function returnToServices() { router.dismissTo('/services'); }

/** Canonical complete list for the current in-memory Guest session. */
export function SessionServiceRequestsScreen() {
  const { removeRequest, requests, updateRequest } = useSessionServiceRequests();
  const completeSessionRequest = useCompleteSessionServiceRequest();
  const { editRequestId, returnTo } = useLocalSearchParams<{ editRequestId?: string; returnTo?: string }>();
  const [filter, setFilter] = useState<ServiceRequestFilter>('ACTIVE');
  const [nowMs] = useState(() => Date.now());
  const filteredRequests = filterServiceRequests(requests, filter);
  const editingRequest = typeof editRequestId === 'string' ? requests.find((request) => request.sessionRequestId === editRequestId && request.status !== 'COMPLETED') : undefined;
  const supportsInlineEdit = Boolean(editingRequest && editingRequest.kind === 'HOTEL_ASSIGNED');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!editingRequest || !supportsInlineEdit) return;
    const timer = setTimeout(() => {
      setTitle(editingRequest.title);
      setSummary(editingRequest.summary ?? '');
    }, 0);
    return () => clearTimeout(timer);
  }, [editingRequest, nowMs, supportsInlineEdit]);

  function closeEditor() { router.dismissTo(returnTo === 'account' ? '/account' : '/services/requests'); }
  function saveEditor() {
    if (!editingRequest) return;
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const nextSummary = summary.trim();
    updateRequest(editingRequest.sessionRequestId, {
      kind: editingRequest.kind,
      origin: editingRequest.origin,
      status: editingRequest.status,
      title: nextTitle,
      ...(nextSummary ? { summary: nextSummary } : {}),
      ...(editingRequest.details ? { details: editingRequest.details } : {}),
    });
    closeEditor();
  }

  return <View style={styles.screen} testID="session-service-requests-screen">
    <GuestChildHeader backAccessibilityLabel="Volver a servicios" backTestID="session-service-requests-back" onBack={returnToServices} title="Mis servicios" />
    <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterList} testID="session-service-request-filters">
        {serviceRequestFilters.map((option) => <Pressable accessibilityRole="radio" accessibilityState={{ selected: filter === option.value }} key={option.value} onPress={() => setFilter(option.value)} style={[styles.filterChip, filter === option.value && styles.filterChipSelected]} testID={`session-service-request-filter-${option.value}`}><Text style={styles.filterLabel}>{option.label}</Text></Pressable>)}
      </ScrollView>
      {filteredRequests.length === 0 ? <Text style={styles.empty}>{serviceRequestFilters.find((option) => option.value === filter)?.emptyText}</Text> : filteredRequests.map((request) => <SessionServiceRequestCard key={request.sessionRequestId} nowMs={nowMs} onComplete={completeSessionRequest} onRemove={removeRequest} onEdit={(item) => {
        const target = sessionServiceRequestEditPath(item);
        router.push({ pathname: target, params: { editRequestId: item.sessionRequestId, editMode: item.kind, returnTo: 'requests' } });
      }} request={request} />)}
    </ScrollView>
    <Modal animationType="slide" onRequestClose={closeEditor} transparent visible={supportsInlineEdit}>
      <View style={styles.screen}>
        <View accessibilityViewIsModal style={styles.content} testID="session-service-request-editor">
          <Text accessibilityRole="header" style={styles.screenTitle}>Editar servicio</Text>
          <Text style={styles.title}>Nombre</Text>
          <TextInput accessibilityLabel="Nombre del servicio" maxLength={60} onChangeText={setTitle} style={styles.card} testID="session-service-request-editor-title" value={title} />
          <Text style={styles.title}>Detalle</Text>
          <TextInput accessibilityLabel="Detalle del servicio" maxLength={150} multiline onChangeText={setSummary} style={styles.card} testID="session-service-request-editor-summary" value={summary} />
          <Pressable accessibilityRole="button" onPress={saveEditor} style={styles.backButton} testID="session-service-request-editor-save"><Text style={styles.backButtonLabel}>Guardar cambios</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={closeEditor} style={styles.backButton} testID="session-service-request-editor-cancel"><Text style={styles.backButtonLabel}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
    <GuestNavigationShell />
  </View>;
}
