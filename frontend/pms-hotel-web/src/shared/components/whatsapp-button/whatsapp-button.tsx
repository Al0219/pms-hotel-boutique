'use client';

import React from 'react';

interface WhatsAppButtonProps {
  phoneNumber?: string;
  className?: string;
}

export function WhatsAppButton({ phoneNumber, className = '' }: WhatsAppButtonProps) {
  const number = phoneNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '502XXXXXXXX';
  const cleanNumber = number.replace(/[^\d]/g, '') || '502XXXXXXXX';
  const message =
    'Hola, quisiera más información sobre disponibilidad y reservas en Hotel Boutique';
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-[3.25rem] h-[3.25rem] rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
      style={{
        width: '3.25rem',
        height: '3.25rem',
        borderRadius: '9999px',
        backgroundColor: '#25D366',
        color: '#ffffff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
      }}
      aria-label="Contactar por WhatsApp"
      title="Contactar por WhatsApp"
    >
      <svg
        className="w-7 h-7 fill-white text-white"
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="#ffffff"
        style={{
          width: '1.75rem',
          height: '1.75rem',
          fill: '#ffffff',
          color: '#ffffff',
          display: 'block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <path
          fill="#ffffff"
          d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.217 8.217 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.182 8.182 0 0 1 2.41 5.83c.01 4.54-3.69 8.23-8.22 8.23zm4.78-6.19c-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.18.26-.69.86-.84 1.04-.16.17-.31.2-.57.07-.26-.13-1.1-.41-2.09-1.29-.77-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.16.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.52c-.17 0-.46.07-.7.33-.24.26-.93.91-.93 2.22s.95 2.58 1.08 2.75c.13.17 1.88 2.87 4.55 4.02.63.27 1.13.44 1.52.56.64.2 1.22.17 1.68.1.51-.08 1.56-.64 1.78-1.26.22-.61.22-1.14.15-1.26-.07-.11-.24-.18-.5-.31z"
        />
      </svg>
    </a>
  );
}
