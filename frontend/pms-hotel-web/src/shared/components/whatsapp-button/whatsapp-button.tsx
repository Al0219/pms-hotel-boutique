'use client';

import styles from './whatsapp-button.module.css';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  className?: string;
}

export function WhatsAppButton({ phoneNumber, className = '' }: WhatsAppButtonProps) {
  const number = phoneNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '502XXXXXXXX';
  // Strip non-digits except initial + if any for URL
  const cleanNumber = number.replace(/[^\d]/g, '') || '50212345678';
  const message = 'Hola, quisiera más información sobre disponibilidad y reservas en Hotel Boutique';
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className={`${styles.container} ${className}`}>
      <span className={styles.tooltip} role="tooltip">
        ¿Dudas? Escríbenos por WhatsApp
      </span>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.button} bg-[#25D366] hover:bg-[#20bd5a] text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110`}
        aria-label="Contactar por WhatsApp para información sobre reservas"
        title="Escríbenos por WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={styles.icon}
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.82 2.41c-1.46 0-2.9-.38-4.17-1.11l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.43c0-4.54 3.7-8.24 8.24-8.24zm4.8 11.66c-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.18.26-.69.86-.84 1.04-.16.17-.31.2-.57.07-.26-.13-1.1-.41-2.09-1.29-.77-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.16.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.52c-.17 0-.46.07-.7.33-.24.26-.93.91-.93 2.22s.95 2.58 1.08 2.75c.13.17 1.88 2.87 4.55 4.02.63.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.56-.64 1.78-1.26.22-.61.22-1.14.15-1.26-.07-.11-.24-.18-.5-.31z"
          />
        </svg>
      </a>
    </div>
  );
}
