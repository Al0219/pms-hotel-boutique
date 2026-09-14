import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { GuestNavigationShell } from '@/modules/navigation';
import { type ServicesService } from '@/modules/services/data/services/ServicesService';
import { type ServiceCatalogItem } from '@/modules/services/domain/models/ServiceCatalog';
import { useServicesCatalog } from '@/modules/services/presentation/hooks/useServicesCatalog';
import { useSubmitServiceRequest } from '@/modules/services/presentation/hooks/useSubmitServiceRequest';
import { servicesStyles } from '@/modules/services/presentation/servicesStyles';
import { deriveRemoteState } from '@/state/remoteState';

export interface ServicesScreenProps {
  service?: ServicesService;
}

interface ServicesStateCardProps {
  title: string;
  body: string;
  testID: string;
  onRetry?: () => void;
  offline?: boolean;
  success?: boolean;
  retryLabel?: string;
}

function ServicesStateCard({
  title,
  body,
  testID,
  onRetry,
  offline = false,
  success = false,
  retryLabel = 'Reintentar',
}: ServicesStateCardProps) {
  return (
    <View
      style={[
        servicesStyles.stateCard,
        offline && servicesStyles.offlineStateCard,
        success && servicesStyles.successStateCard,
      ]}
      testID={testID}
    >
      <Text style={servicesStyles.stateTitle}>{title}</Text>
      <Text style={servicesStyles.stateBody}>{body}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={servicesStyles.button}
        >
          <Text style={servicesStyles.buttonLabel}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CatalogLoading() {
  return (
    <View style={[servicesStyles.content, servicesStyles.screenContent]} testID="services-catalog-loading">
      <Text style={servicesStyles.title}>Cargando servicios</Text>
      <View style={servicesStyles.skeleton} />
      <View style={servicesStyles.skeleton} />
      <View style={servicesStyles.skeleton} />
    </View>
  );
}

function ServiceCard({
  item,
  isSelected,
  onPress,
}: {
  item: ServiceCatalogItem;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[servicesStyles.serviceCard, isSelected && servicesStyles.serviceCardSelected]}
      testID={`service-card-${item.fixtureKey}`}
    >
      <Text style={servicesStyles.serviceLabel}>{item.label}</Text>
      <Text style={servicesStyles.serviceDetail}>{item.detailText}</Text>
      <Text style={servicesStyles.servicePrice}>{item.priceText}</Text>
    </Pressable>
  );
}

function ServiceNavigationCard({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={servicesStyles.serviceNavigationCard}
      testID={testID}
    >
      <Text style={servicesStyles.serviceLabel}>{label}</Text>
      <Text accessible={false} style={servicesStyles.navigationChevron} testID={`${testID}-chevron`}>›</Text>
    </Pressable>
  );
}

/** Services presentation: local selection plus Query-owned remote/mutation state. */
export function ServicesScreen({ service }: ServicesScreenProps) {
  const catalogQuery = useServicesCatalog(service);
  const catalogState = deriveRemoteState(catalogQuery, () => false);
  const submission = useSubmitServiceRequest(service);
  const [selectedFixtureKey, setSelectedFixtureKey] = useState<string | null>(null);
  const submissionInFlight = useRef(false);

  const selectedService = catalogState.kind === 'success'
    ? catalogState.data.items.find((item) => item.fixtureKey === selectedFixtureKey) ?? null
    : null;

  function submitSelectedService(): void {
    if (!selectedService || submission.isPending || submissionInFlight.current) return;

    submissionInFlight.current = true;
    submission.mutate(selectedService.fixtureKey, {
      onSettled: () => {
        submissionInFlight.current = false;
      },
    });
  }

  function resetToBase(): void {
    submission.reset();
    submissionInFlight.current = false;
    setSelectedFixtureKey(null);
  }

  if (catalogState.kind === 'loading') {
    return (
      <View style={servicesStyles.screen}>
        <CatalogLoading />
        <GuestNavigationShell />
      </View>
    );
  }

  if (catalogState.kind === 'offline') {
    return (
      <View style={servicesStyles.screen}>
        <View style={[servicesStyles.content, servicesStyles.screenContent]}>
          <ServicesStateCard
            body="Conéctate a internet para solicitar este servicio."
            offline
            onRetry={() => void catalogQuery.refetch()}
            testID="services-catalog-offline"
            title="Sin conexión"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  if (catalogState.kind === 'error') {
    return (
      <View style={servicesStyles.screen}>
        <View style={[servicesStyles.content, servicesStyles.screenContent]}>
          <ServicesStateCard
            body="Intenta nuevamente."
            onRetry={() => void catalogQuery.refetch()}
            testID="services-catalog-error"
            title="No pudimos cargar los servicios"
          />
        </View>
        <GuestNavigationShell />
      </View>
    );
  }

  // `isEmpty` is deliberately always false for this task: Empty has neither
  // an approved frame nor an Acceptance Criterion. This guard is only an
  // exhaustive type boundary and does not render an Empty experience.
  if (catalogState.kind === 'empty') {
    return null;
  }

  if (submission.isSuccess) {
    return (
      <View style={servicesStyles.screen}>
        <ScrollView
          contentContainerStyle={[
            servicesStyles.content,
            servicesStyles.successContent,
          ]}
          style={servicesStyles.scroll}
        >
          <ServicesStateCard
            body="Recibimos tu solicitud."
            onRetry={resetToBase}
            retryLabel="Volver a servicios"
            success
            testID="services-submit-success"
            title="Servicio solicitado"
          />
        </ScrollView>
        <GuestNavigationShell />
      </View>
    );
  }

  const isSubmitOffline = submission.isError && submission.error instanceof NetworkError;
  const isSubmitError = submission.isError && !isSubmitOffline;
  const hasSubmitFailure = isSubmitOffline || isSubmitError;

  return (
    <View style={servicesStyles.screen} testID="services-screen">
      <ScrollView contentContainerStyle={servicesStyles.content} style={servicesStyles.scroll}>
        <Text style={servicesStyles.title}>Servicios</Text>
        <ServiceNavigationCard label="Limpieza incluida" onPress={() => router.push('/services/housekeeping')} testID="services-housekeeping-launcher" />
        <ServiceNavigationCard label="Room Service" onPress={() => router.push('/services/room-service')} testID="services-room-service-launcher" />
        {!hasSubmitFailure ? (
          <View style={servicesStyles.catalog}>
            {catalogState.data.items.map((item) => (
              <ServiceCard
                isSelected={item.fixtureKey === selectedFixtureKey}
                item={item}
                key={item.fixtureKey}
                onPress={() => setSelectedFixtureKey(item.fixtureKey)}
              />
            ))}
          </View>
        ) : null}

        {selectedService ? (
          <View style={servicesStyles.selection} testID="services-selection">
            <Text style={servicesStyles.selectionHeading}>Tu selección</Text>
            <Text style={servicesStyles.serviceLabel}>{selectedService.label}</Text>
            <Text style={servicesStyles.serviceDetail}>{selectedService.detailText}</Text>
            <Text style={servicesStyles.servicePrice}>{selectedService.priceText}</Text>
          </View>
        ) : null}

        {isSubmitOffline ? (
          <ServicesStateCard
            body="Conéctate a internet para solicitar este servicio."
            offline
            onRetry={submitSelectedService}
            testID="services-submit-offline"
            title="Sin conexión"
          />
        ) : null}

        {isSubmitError ? (
          <ServicesStateCard
            body="Intenta nuevamente."
            onRetry={submitSelectedService}
            testID="services-submit-error"
            title="No pudimos enviar tu solicitud"
          />
        ) : null}

        {!hasSubmitFailure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !selectedService || submission.isPending }}
            disabled={!selectedService || submission.isPending}
            onPress={submitSelectedService}
            style={[
              servicesStyles.button,
              (!selectedService || submission.isPending) && servicesStyles.buttonDisabled,
            ]}
            testID="services-submit-button"
          >
            <Text style={servicesStyles.buttonLabel}>
              {submission.isPending ? 'Confirmando...' : 'Confirmar servicio'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <GuestNavigationShell />
    </View>
  );
}
