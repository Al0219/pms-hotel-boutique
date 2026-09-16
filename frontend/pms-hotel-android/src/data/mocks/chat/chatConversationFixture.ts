import { type ChatConversationFixtureDto } from '@/modules/chat/data/dtos/ChatFixtureDto';

/** Approved local presentation dataset for IMP-AND-0104. */
export const chatConversationFixture: ChatConversationFixtureDto = {
  context: {
    guestDisplayName: 'María López',
    stayReferenceText: 'HB-2026-08421',
  },
  messages: [
    {
      fixtureKey: 'chat-message-reception-01',
      author: 'RECEPTION',
      text: 'Hola María, ¿en qué podemos ayudarte?',
    },
    {
      fixtureKey: 'chat-message-guest-01',
      author: 'GUEST',
      text: 'Necesito un taxi mañana a las 6:00.',
    },
    {
      fixtureKey: 'chat-message-reception-02',
      author: 'RECEPTION',
      text: 'Claro. ¿Destino Aeropuerto La Aurora?',
    },
    {
      fixtureKey: 'chat-message-guest-02',
      author: 'GUEST',
      text: 'Sí, por favor.',
    },
    {
      fixtureKey: 'chat-message-reception-03',
      author: 'RECEPTION',
      text: 'Listo. Solicitud #4832 creada · salida 06:00.',
      serviceAssignment: {
        assignmentKey: 'chat-assignment-transfer-01',
        title: 'Traslado al aeropuerto',
        summary: 'Asignado por Recepción',
      },
    },
  ],
};
