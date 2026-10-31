'use client';

import React from 'react';

export function FooterAppDownload() {
  const androidApkUrl =
    process.env.NEXT_PUBLIC_ANDROID_APK_URL || '/downloads/hotel-boutique.apk';

  return (
    <div
      className="py-6 flex items-center justify-center gap-4 flex-wrap"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
      }}
      aria-label="Descargas de la aplicación móvil"
    >
      {/* Botón Android APK con Logo Vectorial Oficial en verde #3DDC84 */}
      <a
        href={androidApkUrl}
        download
        className="flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-white shadow-xl transition-all hover:scale-[1.02] group no-underline"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '1rem',
          backgroundColor: '#1c1917',
          border: '1px solid #292524',
          color: '#ffffff',
          textDecoration: 'none',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
        }}
        aria-label="Descargar APK / Para Android"
      >
        <svg
          className="w-8 h-8 fill-[#3DDC84] group-hover:scale-110 transition-transform flex-shrink-0"
          style={{ width: '2rem', height: '2rem', fill: '#3DDC84', flexShrink: 0 }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.996-3.4572c.1082-.1876.0441-.4282-.1435-.5364-.1878-.1082-.428-.0441-.5362.1435l-2.0227 3.5034C15.5458 8.4116 13.8242 8 12 8s-3.5458.4116-5.1741 1.0747L4.8032 5.5713c-.1082-.1876-.3484-.2517-.5362-.1435-.1876.1082-.2517.3488-.1435.5364l1.996 3.4572C2.6884 11.2868 0 14.8214 0 19h24c0-4.1786-2.6884-7.7132-6.1185-9.6786" />
        </svg>
        <div className="flex flex-col text-left leading-tight" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
          <span className="text-[11px] text-stone-400 font-medium uppercase tracking-wider" style={{ fontSize: '11px', color: '#a8a29e', fontWeight: 500, letterSpacing: '0.05em' }}>
            Descargar APK
          </span>
          <span className="text-sm font-semibold text-white" style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
            Para Android
          </span>
        </div>
      </a>

      {/* Botón Apple Store con Logo Vectorial Oficial Blanco y Badge Muy pronto */}
      <div
        className="flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-stone-900/80 border border-stone-800 text-stone-300 shadow-xl"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '1rem',
          backgroundColor: '#1c1917cc',
          border: '1px solid #292524',
          color: '#d6d3d1',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        }}
        aria-label="App Store - Muy pronto"
      >
        <svg
          className="w-8 h-8 fill-white flex-shrink-0"
          style={{ width: '2rem', height: '2rem', fill: '#ffffff', flexShrink: 0 }}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.47c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.69-1.12 1.83-1 2.94 1.08.08 2.15-.46 2.81-1.28z" />
        </svg>
        <div className="flex flex-col text-left leading-tight" style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
          <span className="text-[11px] text-stone-400 font-medium uppercase tracking-wider" style={{ fontSize: '11px', color: '#a8a29e', fontWeight: 500, letterSpacing: '0.05em' }}>
            Disponible en
          </span>
          <span className="text-sm font-semibold text-white" style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
            App Store
          </span>
        </div>
        <span
          className="ml-2 text-[11px] bg-stone-800 text-amber-400 border border-stone-700 px-2.5 py-0.5 rounded-full font-medium"
          style={{
            marginLeft: '0.5rem',
            fontSize: '11px',
            backgroundColor: '#292524',
            color: '#fbbf24',
            border: '1px solid #44403c',
            padding: '0.125rem 0.625rem',
            borderRadius: '9999px',
            fontWeight: 500,
          }}
        >
          Muy pronto
        </span>
      </div>
    </div>
  );
}
