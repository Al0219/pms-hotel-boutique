'use client';

import { FaqChatbot } from '../faq-chatbot';
import { WhatsAppButton } from '../whatsapp-button';

export function BoutiqueAssistantWidget() {
  return (
    <aside
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
      aria-label="Atención al cliente y mensajería"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <FaqChatbot />
      <WhatsAppButton />
    </aside>
  );
}
