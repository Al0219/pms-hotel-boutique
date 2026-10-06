'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { demoCardDocument } from '../content/demo-card-document';
import { demoCardOptions, readDemoCard, type DemoCardToken } from '../model/demo-card';
import styles from './demo-card-gateway.module.css';

export function DemoCardGateway({ holderName, card, onChange, disabled }: { holderName: string; card: DemoCardToken | null; onChange: (card: DemoCardToken | null) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [frameHeight, setFrameHeight] = useState(700);
  const frame = useRef<HTMLIFrameElement>(null);
  const channel = useId();
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (disabled || !editing || event.source !== frame.current?.contentWindow || event.origin !== 'null' || !event.data || event.data.channel !== channel) return;
      if (event.data.type === 'PMS_DEMO_RESIZE' && Number.isFinite(event.data.height) && event.data.height >= 300 && event.data.height <= 1200) setFrameHeight(Math.ceil(event.data.height));
      if (event.data.type === 'PMS_DEMO_CHANGED') onChange(null);
      if (event.data.type === 'PMS_DEMO_TOKEN') { const token = readDemoCard(event.data.card); if (token) { onChange(token); setEditing(false); } }
    }
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [channel, disabled, editing, onChange]);
  return <div className={styles.gateway}><div className={styles.heading}><span className={styles.icon} aria-hidden="true">▣</span><h3>Garantizar con tarjeta</h3></div>
    <p className={styles.notice}>No se almacena PAN/CVV en el PMS; la pasarela configurada procesará los datos sensibles. Aquí solo usamos tarjetas ficticias.</p>
    {editing ? <><iframe className={styles.frame} style={{ height: frameHeight }} ref={frame} title="Formulario aislado de tarjeta de prueba" srcDoc={demoCardDocument} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'PMS_DEMO_INIT', channel, holderName }, '*')} /><button className={styles.edit} type="button" disabled={disabled} onClick={() => { onChange({ token: 'demo_visa_approved', brand: 'Visa', last4: '4242', holderName }); setEditing(false); }}>Volver a Visa de prueba</button></> : <>
      <dl className={styles.cardDetails}><div><dt>Titular</dt><dd>{card?.holderName ?? holderName}</dd></div><div><dt>Tarjeta de prueba</dt><dd><span aria-hidden="true">•••• •••• •••• </span>{card?.last4 ?? '4242'}<span className={styles.brand}>{card?.brand ?? 'Visa'}</span></dd></div></dl>
      <button className={styles.edit} type="button" disabled={disabled} onClick={() => { onChange(null); setEditing(true); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>Usar otra tarjeta de prueba</button>
    </>}
    <div className={styles.scenario}><span className={styles.simulatorBadge}>Simulador de pruebas</span><label htmlFor={`${channel}-scenario`}>Resultado de demostración</label><select id={`${channel}-scenario`} disabled={disabled || editing} value={card?.token ?? demoCardOptions[0].token} onChange={event => { const option = demoCardOptions.find(item => item.token === event.target.value)!; onChange({ token: option.token, brand: option.brand, last4: option.last4, holderName }); }}>{demoCardOptions.map(option => <option value={option.token} key={option.token}>{option.label}</option>)}</select></div>
    <p className={styles.secure}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>Simulador de PSP · No ingreses datos de una tarjeta real</p>
  </div>;
}
