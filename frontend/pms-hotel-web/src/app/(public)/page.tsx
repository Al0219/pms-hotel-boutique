import React from 'react';
import { PublicSearchForm } from '@/modules/booking';

export default function PublicPage() {
  return (
    <div style={{ padding: 'var(--space-8) var(--space-4)', maxWidth: '1200px', margin: '0 auto' }}>
      <section style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
        <span
          style={{
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 'var(--font-weight-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-brand-primary-strong)',
            backgroundColor: 'var(--color-brand-subtle)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-xl)',
            display: 'inline-block',
            marginBottom: 'var(--space-3)',
          }}
        >
          Experiencia Boutique & Confort
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: 'var(--font-size-display-xl)',
            lineHeight: 'var(--line-height-display-xl)',
            color: 'var(--color-brand-dark)',
            margin: '0 0 var(--space-4) 0',
            letterSpacing: 'var(--letter-spacing-display-xl)',
          }}
        >
          PMS Hotel Boutique
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-family-body)',
            fontSize: 'var(--font-size-body-lg)',
            lineHeight: 'var(--line-height-body-lg)',
            color: 'var(--color-text-secondary)',
            maxWidth: '640px',
            margin: '0 auto',
          }}
        >
          Disfruta una estancia inolvidable con atención personalizada, espacios de lujo y confort de clase mundial.
        </p>
      </section>

      <PublicSearchForm />
    </div>
  );
}
