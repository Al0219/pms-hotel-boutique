/** Pie de página principal con estructura accesible. */
'use client';

import React from 'react';
import { FooterAppDownload } from '@/shared/components';

export { FooterAppDownload };

export function Footer() {
  return (
    <footer className="bg-[#121815] text-stone-200 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <FooterAppDownload />
      </div>
    </footer>
  );
}

export default Footer;
