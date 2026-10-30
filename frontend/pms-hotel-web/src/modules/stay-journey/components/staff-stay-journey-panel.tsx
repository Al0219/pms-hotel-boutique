'use client';
import {SvgIcon} from '@/shared/components/svg-icon';
import { useEffect, useState } from 'react';
import { Modal } from '@/shared/components';
import { SyntheticVisaForm } from '@/modules/payments';
import { useStayJourney } from '../hooks/use-stay-journey';
import type { JourneyContext } from '../service/stay-journey.service';
import styles from './staff-stay-journey-panel.module.css';

export function StaffStayJourneyPanel(props: JourneyContext & { actorId: string; sessionId: string; financial: boolean; active?: boolean; paymentOpen?: boolean; onOpenChange?: (open:boolean)=>void; initialAmount?: string; onAmountChange?: (amount:string)=>void; disabled?: boolean; onLockChange?: (locked: boolean) => void }) {
  return <Panel key={`${props.sessionId}:${props.propertyId}:${props.reservationId}:${props.stayId}:${props.financial}`} {...props} />;
}
function Panel({ actorId, sessionId, financial, active = true, paymentOpen = false, onOpenChange, initialAmount, onAmountChange, disabled = false, onLockChange, ...context }: JourneyContext & { actorId: string; sessionId: string; financial: boolean; active?: boolean; paymentOpen?: boolean; onOpenChange?: (open:boolean)=>void; initialAmount?: string; onAmountChange?: (amount:string)=>void; disabled?: boolean; onLockChange?: (locked: boolean) => void }) {
  const journey = useStayJourney(context, actorId, sessionId, financial);
  const [fileError,setFileError]=useState('');
  const paying=paymentOpen,setPaying=(open:boolean)=>onOpenChange?.(open);
  useEffect(() => { onLockChange?.(journey.busy || Boolean(journey.pending)); }, [journey.busy, journey.pending, onLockChange]);
  const summary = financial && journey.summary.isSuccess ? journey.summary.data : undefined, document = financial && journey.document.isSuccess ? journey.document.data : undefined;
  const eligible=summary?.stay.status==='CHECKED_OUT'&&summary.verifiable&&summary.balance==='0.00'&&summary.pendingOrders===0&&summary.unpostedOrders===0;
  async function pay(input?: { amount: string; currency: 'GTQ'; instrumentToken: string }) {
    const receipt = await journey.pay(journey.pending ? undefined : input);
    if (receipt) setPaying(false);
  }
  function pdf(download:boolean){const file=journey.file.data;if(!file)return;const bytes=Uint8Array.from(atob(file.pdfBase64),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));if(download){const a=documentGlobal().createElement('a');a.href=url;a.download=`${file.documentId}.pdf`;a.click();}else window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function documentGlobal(){return globalThis.document;}
  return <div>
    <div className={styles.actions}>
      {financial && journey.pending && <button type="button" className={styles.primary} disabled={disabled || journey.busy || !journey.ready} onClick={() => setPaying(true)}>Recuperar pago pendiente</button>}
      {summary && summary.unpostedOrders > 0 && <button type="button" className={styles.primary} disabled={disabled || journey.busy || Boolean(journey.pending)} onClick={() => void journey.reconcile()}>Contabilizar pedidos entregados</button>}
      {eligible && document && journey.file.isSuccess && !journey.file.data && <button type="button" className={styles.primary} disabled={journey.busy||journey.summary.isFetching} onClick={()=>{setFileError('');void journey.issueFile().catch(()=>setFileError('No se pudo emitir el documento. Reintenta: se conservará el original.'));}}><SvgIcon name="reservations" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Generar documento</button>}
      {journey.file.data && <><button type="button" className={styles.secondary} onClick={()=>pdf(false)}><SvgIcon name="reservations" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Visualizar documento</button><button type="button" className={styles.secondary} onClick={()=>pdf(true)}><SvgIcon name="arrow" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Descargar</button></>}
      {journey.file.isError && <p role="alert">No se pudo recuperar el PDF original.</p>}{fileError&&!journey.file.data&&<p role="alert">{fileError}</p>}
    </div>
    {(summary?.estimatedTransfers?.length??0)>0&&<div aria-label="Traslados estimados"><p>Traslados pendientes · fuera del saldo</p>{summary?.estimatedTransfers?.map(e=><p key={e.id}>{e.description} · Q. {e.amount}</p>)}</div>}
    {active && journey.summary.isError && <p role="alert">No se pudo verificar el saldo para pagar con tarjeta.</p>}
    {journey.notice && <p role="status">{journey.notice}</p>}{journey.error && !paying && <p role="alert" className={styles.error}>{journey.error}</p>}
    {paying && <Modal className={styles.paymentDialog} title={journey.pending ? 'Recuperar pago pendiente' : 'Tarjeta de prueba'} busy={journey.busy} onClose={() => setPaying(false)}>
      <button type="button" className={styles.closePayment} aria-label="Cerrar tarjeta" disabled={journey.busy} onClick={() => setPaying(false)}>×</button>
      {journey.pending ? <><p>Resultado pendiente de comprobar para Q{journey.pending.input.amount}. Se reutilizará exactamente la misma referencia.</p><button type="button" className={styles.primary} disabled={disabled || journey.busy || !journey.ready} onClick={() => void pay()}><SvgIcon name="arrow" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Recuperar misma operación</button></> : summary ? <SyntheticVisaForm initialAmount={initialAmount} onAmountChange={onAmountChange} balance={summary.balance} today={new Intl.DateTimeFormat('en-CA', { timeZone: summary.stay.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} busy={disabled || journey.busy || !journey.ready || journey.summary.isFetching} onSubmit={input => void pay(input)} /> : <p role="status">Consultando saldo…</p>}
      {journey.error && <p role="alert" className={styles.error}>{journey.error}</p>}
    </Modal>}
  </div>;
}
