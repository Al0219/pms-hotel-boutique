import * as Notifications from 'expo-notifications';

import { getServiceCompletionReminderAt } from '@/modules/service-requests/domain/serviceRequestPresentation';
import { type SessionServiceRequest } from '@/modules/service-requests/domain/SessionServiceRequest';

export interface ServiceCompletionReminderService {
  schedule(request: SessionServiceRequest): Promise<string | null>;
  cancel(identifier: string): Promise<void>;
}

/** Native scheduling is deliberately used only while AppClock is SYSTEM. */
export class ExpoServiceCompletionReminderService implements ServiceCompletionReminderService {
  async schedule(request: SessionServiceRequest): Promise<string | null> {
    const reminderAt = getServiceCompletionReminderAt(request);
    if (reminderAt === null || reminderAt <= Date.now()) return null;
    const permission = await Notifications.getPermissionsAsync();
    const status = permission.granted ? permission.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    return Notifications.scheduleNotificationAsync({
      content: {
        title: '¿Ya recibiste tu servicio?',
        body: `${request.title} estaba programado hace 10 minutos. Si ya fue entregado, puedes marcarlo como completado.`,
        data: { pathname: '/services/requests', sessionRequestId: request.sessionRequestId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(reminderAt) },
    });
  }

  async cancel(identifier: string): Promise<void> { await Notifications.cancelScheduledNotificationAsync(identifier); }
}
