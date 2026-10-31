'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import styles from './faq-chatbot.module.css';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  action?: {
    type: 'whatsapp';
    label: string;
    url: string;
  };
}

const FAQ_ITEMS = [
  {
    question: '¿Cuáles son los horarios de Check-in y Check-out?',
    answer: 'Check-in a partir de las 15:00 hrs y Check-out hasta las 11:00 hrs.',
  },
  {
    question: '¿Qué amenidades incluyen las habitaciones?',
    answer: 'Wi-Fi de alta velocidad, desayuno artesanal incluido, piscina climatizada, aire acondicionado, amenidades orgánicas y estacionamiento privado.',
  },
  {
    question: '¿Cuáles son las políticas de cancelación?',
    answer: 'Cancelación gratuita hasta 48 horas antes de la fecha de llegada.',
  },
  {
    question: '¿Cuáles son los métodos de pago?',
    answer: 'Tarjetas de crédito/débito (Visa, MasterCard), transferencias bancarias y pago en recepción en Quetzales (GTQ) o Dólares (USD).',
  },
  {
    question: 'Hablar con recepción',
    answer: 'Con gusto te comunicamos con nuestro equipo de recepción vía WhatsApp para darte atención inmediata y personalizada.',
    isReception: true,
  },
];

let messageSeq = 0;

function formatMessageTime(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createUserMessage(text: string): Message {
  messageSeq += 1;
  return {
    id: `user-${messageSeq}`,
    sender: 'user',
    text,
    time: formatMessageTime(),
  };
}

function createBotMessage(text: string, action?: Message['action']): Message {
  messageSeq += 1;
  return {
    id: `bot-${messageSeq}`,
    sender: 'assistant',
    text,
    time: formatMessageTime(),
    ...(action ? { action } : {}),
  };
}

export function FaqChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '¡Hola! Bienvenido a Hotel Boutique. ¿En qué podemos ayudarte hoy? Puedes elegir una de las preguntas frecuentes o escribir tu consulta.',
      time: '12:00',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '502XXXXXXXX';
  const cleanNumber = number.replace(/[^\d]/g, '') || '50212345678';
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent('Hola, quisiera más información sobre disponibilidad y reservas en Hotel Boutique')}`;

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSelectFaq = (faq: (typeof FAQ_ITEMS)[number]) => {
    const userMsg = createUserMessage(faq.question);
    const botMsg = createBotMessage(
      faq.answer,
      faq.isReception
        ? {
            type: 'whatsapp',
            label: 'Abrir chat de WhatsApp',
            url: whatsappUrl,
          }
        : undefined,
    );

    setMessages(prev => [...prev, userMsg, botMsg]);

    if (faq.isReception) {
      // Direct redirect/open in new tab
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    const userMsg = createUserMessage(query);

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Keyword auto-responses
    const lower = query.toLowerCase();
    let responseText = '';
    let isReception = false;

    if (lower.includes('check-in') || lower.includes('check in') || lower.includes('check-out') || lower.includes('check out') || lower.includes('horario') || lower.includes('hora') || lower.includes('entrada') || lower.includes('salida')) {
      responseText = 'Check-in a partir de las 15:00 hrs y Check-out hasta las 11:00 hrs.';
    } else if (lower.includes('amenidad') || lower.includes('servicio') || lower.includes('incluye') || lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('desayuno') || lower.includes('piscina') || lower.includes('estacionamiento') || lower.includes('parqueo')) {
      responseText = 'Wi-Fi de alta velocidad, desayuno artesanal incluido, piscina climatizada, aire acondicionado, amenidades orgánicas y estacionamiento privado.';
    } else if (lower.includes('cancel') || lower.includes('política') || lower.includes('politica') || lower.includes('reembolso')) {
      responseText = 'Cancelación gratuita hasta 48 horas antes de la fecha de llegada.';
    } else if (lower.includes('pago') || lower.includes('tarjeta') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('transferencia') || lower.includes('quetzal') || lower.includes('dolar') || lower.includes('dólar') || lower.includes('efectivo')) {
      responseText = 'Tarjetas de crédito/débito (Visa, MasterCard), transferencias bancarias y pago en recepción en Quetzales (GTQ) o Dólares (USD).';
    } else if (lower.includes('recepcion') || lower.includes('recepción') || lower.includes('humano') || lower.includes('persona') || lower.includes('asesor') || lower.includes('agente') || lower.includes('whatsapp') || lower.includes('contacto') || lower.includes('teléfono') || lower.includes('telefono')) {
      responseText = 'Con gusto te comunicamos directamente con nuestro equipo de recepción por WhatsApp para asistirte.';
      isReception = true;
    } else if (lower.includes('reserva') || lower.includes('habitacion') || lower.includes('habitación') || lower.includes('cuarto') || lower.includes('suite') || lower.includes('precio') || lower.includes('tarifa') || lower.includes('disponible') || lower.includes('disponibilidad')) {
      responseText = 'Puedes consultar la disponibilidad y tarifas en tiempo real usando el buscador principal de nuestra portada, o bien comunicarte con recepción.';
      isReception = true;
    } else {
      responseText = 'Gracias por contactarnos. Para brindarte una respuesta exacta sobre tu consulta, nuestro equipo de recepción está disponible vía WhatsApp.';
      isReception = true;
    }

    setTimeout(() => {
      const botMsg = createBotMessage(
        responseText,
        isReception
          ? {
              type: 'whatsapp',
              label: 'Contactar a Recepción por WhatsApp',
              url: whatsappUrl,
            }
          : undefined,
      );
      setMessages(prev => [...prev, botMsg]);
    }, 400);
  };

  return (
    <div className={styles.floatingWrapper}>
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="relative w-13 h-13 rounded-full bg-[#1E2B25] text-white border border-stone-600 shadow-xl flex items-center justify-center hover:scale-105 transition-all"
        style={{
          width: '3.25rem',
          height: '3.25rem',
          borderRadius: '9999px',
          backgroundColor: '#1E2B25',
          color: '#ffffff',
          border: '1px solid #57534e',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
        }}
        aria-label="Preguntas Frecuentes - Abrir chat de atención"
        title="Preguntas Frecuentes"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <span
            className="w-6 h-6 flex items-center justify-center text-xl font-bold leading-none text-white"
            style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}
          >
            ✕
          </span>
        ) : (
          <svg
            className="w-6 h-6 text-white stroke-white fill-none"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '24px', height: '24px', stroke: '#ffffff', fill: 'none', color: '#ffffff', display: 'block' }}
            aria-hidden="true"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </svg>
        )}
        <span
          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black shadow"
          style={{
            position: 'absolute',
            top: '-0.25rem',
            right: '-0.25rem',
            width: '1rem',
            height: '1rem',
            borderRadius: '9999px',
            backgroundColor: '#f59e0b',
            color: '#000000',
            fontSize: '10px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          ?
        </span>
      </button>

      {isOpen && (
        <div
          className={`${styles.chatWindow} right-0 w-[90vw] sm:w-80 md:w-96 max-h-[75vh] rounded-2xl shadow-2xl`}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            right: 0,
            zIndex: 60,
          }}
          role="dialog"
          aria-label="Asistente Virtual Hotel Boutique"
        >
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.avatar} aria-hidden="true">HB</div>
              <div className={styles.headerTitles}>
                <h3>Hotel Boutique Concierge</h3>
                <p className={styles.headerStatus}>
                  <span className={styles.statusDot} /> En línea · Asistencia rápida
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              ✕
            </button>
          </header>

          <div className={styles.messagesList} tabIndex={0} aria-label="Mensajes de conversación">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.sender === 'user' ? styles.messageUser : styles.messageAssistant}`}
              >
                <div
                  className={`${styles.bubble} ${msg.sender === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}
                >
                  {msg.text}
                  {msg.action?.type === 'whatsapp' && (
                    <div>
                      <a
                        href={msg.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.chatWhatsAppAction}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.82 2.41c-1.46 0-2.9-.38-4.17-1.11l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.43c0-4.54 3.7-8.24 8.24-8.24zm4.8 11.66c-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.18.26-.69.86-.84 1.04-.16.17-.31.2-.57.07-.26-.13-1.1-.41-2.09-1.29-.77-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.16.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.52c-.17 0-.46.07-.7.33-.24.26-.93.91-.93 2.22s.95 2.58 1.08 2.75c.13.17 1.88 2.87 4.55 4.02.63.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.56-.64 1.78-1.26.22-.61.22-1.14.15-1.26-.07-.11-.24-.18-.5-.31z" />
                        </svg>
                        <span>{msg.action.label}</span>
                      </a>
                    </div>
                  )}
                </div>
                <span className={styles.messageTime}>{msg.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.faqSection}>
            <p className={styles.faqLabel}>Preguntas Frecuentes</p>
            <div className={styles.faqChips}>
              {FAQ_ITEMS.map(faq => (
                <button
                  key={faq.question}
                  type="button"
                  className={styles.chip}
                  onClick={() => handleSelectFaq(faq)}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendMessage} className={styles.inputForm}>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              className={styles.inputField}
              aria-label="Escribe tu mensaje para el asistente"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={styles.sendButton}
              aria-label="Enviar mensaje"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
