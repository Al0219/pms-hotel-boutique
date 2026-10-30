'use client';
import {SvgIcon} from '@/shared/components/svg-icon';
import { useRef, useState } from 'react';
import { Modal } from '@/shared/components';
import { StaffStayJourneyPanel } from '@/modules/stay-journey';
import { paymentAmountError } from '@/modules/payments';
import { HttpStatusError } from '@/lib/http';
import { useStaffFolios, useStaffFolio } from '../hooks/use-staff-folio';
import { useReceivedPayment } from '../hooks/use-received-payment';
import { formatLedgerMoney, ledgerMinor, paymentMoney, type ReceivedPayment } from '../model/staff-folio';
import styles from './staff-reservation-folio-panel.module.css';

interface Props { actorId: string; sessionId: string; propertyId: string; reservationId: string; stayId?: string }
function readError(error: unknown): string {
  return error instanceof HttpStatusError && error.status === 401 ? 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
    : error instanceof HttpStatusError && error.status === 403 ? 'No tienes acceso al folio de esta propiedad.'
      : 'No se pudo cargar la contabilidad. El saldo no se considera verificado.';
}
export function StaffReservationFolioPanel(props: Props) {
  return <FolioList key={`${props.sessionId}:${props.propertyId}:${props.reservationId}`} {...props} />;
}
function FolioList(props: Props) {
  const query = useStaffFolios(props.sessionId, props.propertyId, props.reservationId);
  const [selected, setSelected] = useState('');
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  const current = items.find(item => item.id === selected) ?? items[0];
  return <section className={styles.panel} aria-label="Folio y pagos de la reserva">
    <header className={styles.header}><div><span className={styles.overline}>CUENTA DE LA RESERVA</span><h2>Folio y pagos</h2></div>
      <button className={styles.secondary} disabled={query.isFetching} onClick={() => void query.refetch()}><SvgIcon name="arrow" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Actualizar folios</button></header>
    <p className={styles.muted}>Consulta los movimientos y registra los pagos recibidos en recepción. Cada folio conserva su moneda.</p>
    {query.isPending && <p role="status">Cargando folios…</p>}
    {query.isError && <p role="alert" className={styles.error}>{readError(query.error)}</p>}
    {query.isSuccess && !items.length && <div className={styles.warning}>Esta reserva no tiene un folio vinculado. No es posible verificar su saldo ni registrar pagos desde esta pantalla.</div>}
    {items.length > 0 && <>
      <label className={styles.field}>Folio<select value={current?.id ?? ''} onChange={event => setSelected(event.target.value)}>
        {items.map((item, index) => <option key={item.id} value={item.id}>{item.holderLabel?.trim() || `Folio ${index + 1}`} · {item.currency} · {item.status === 'OPEN' ? 'Abierto' : item.status === 'SETTLED' ? 'Liquidado' : 'Cerrado'} · {item.id.slice(0, 8)}</option>)}
      </select></label>
      {query.hasNextPage && <button className={styles.secondary} disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Cargar más folios</button>}
      {current && <Ledger key={`${props.sessionId}:${current.id}`} {...props} folioId={current.id} />}
    </>}
  </section>;
}
function Ledger({ folioId, ...props }: Props & { folioId: string }) {
  const { detail, movements } = useStaffFolio(props.sessionId, props.propertyId, props.reservationId, folioId);
  const operation = useReceivedPayment(props.actorId, props.sessionId, props.propertyId, props.reservationId, folioId);
  const [method, setMethod] = useState<'cash' | 'card'>('cash'), [cardLocked, setCardLocked] = useState(false), [cardOpen,setCardOpen] = useState(false);
  const [amount, setAmount] = useState(''), [description, setDescription] = useState('Pago recibido en recepción');
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({});
  const [confirmation, setConfirmation] = useState<ReceivedPayment | null>(null);
  const trigger = useRef<HTMLButtonElement>(null), amountInput = useRef<HTMLInputElement>(null), descriptionInput = useRef<HTMLInputElement>(null);
  const data = detail.data, rows = movements.data?.pages.flatMap(page => page.items) ?? [];
  const enteredMoney = data ? paymentMoney(amount.trim(), data.folio.currency) : null;
  const amountError = errors.amount && (!data || !enteredMoney || ledgerMinor(enteredMoney) > ledgerMinor(data.balance)) ? data?.folio.currency==='GTQ' ? paymentAmountError(data.balance.amount) : errors.amount : undefined;
  const debt = data && data.movementCount > 0 && ledgerMinor(data.balance) > 0n;
  const payable = data && debt && data.folio.type === 'GUEST' && data.folio.status === 'OPEN';
  const cashLocked = operation.busy || Boolean(operation.pending);
  const locked = cardLocked || operation.busy || Boolean(operation.pending) || !operation.ready || detail.isFetching || detail.isError;
  function review(event: React.FormEvent) {
    event.preventDefault(); if (!data || !payable || locked) return;
    const money = paymentMoney(amount.trim(), data.folio.currency), next: typeof errors = {};
    if (!money) next.amount = data.folio.currency==='GTQ'?paymentAmountError(data.balance.amount):'Ingresa un importe positivo con los decimales de la moneda del folio.';
    else if (ledgerMinor(money) > ledgerMinor(data.balance)) next.amount = data.folio.currency==='GTQ'?paymentAmountError(data.balance.amount):'El importe no puede superar el saldo pendiente.';
    if (!description.trim() || description.trim().length > 255) next.description = 'Describe el pago recibido (1–255 caracteres).';
    setErrors(next);
    if (Object.keys(next).length) { (next.amount ? amountInput : descriptionInput).current?.focus(); return; }
    setConfirmation({ amount: money!, description: description.trim() });
  }
  function close() { setConfirmation(null); queueMicrotask(() => trigger.current?.focus()); }
  async function confirm() {
    const result = await operation.submit(operation.pending ? undefined : confirmation ?? undefined);
    if (result) { setConfirmation(null); setAmount(''); queueMicrotask(() => trigger.current?.focus()); }
  }
  return <div className={styles.ledger}>
    {detail.isPending && <p role="status">Consultando saldo…</p>}
    {detail.isError && <div><p role="alert" className={styles.error}>{readError(detail.error)}</p><button className={styles.secondary} onClick={() => void detail.refetch()}>Reintentar saldo</button></div>}
    {data && <>
      <div className={styles.balance}><div><span>{data.movementCount === 0 ? 'Saldo sin verificar' : debt ? 'Saldo pendiente' : ledgerMinor(data.balance) < 0n ? 'Saldo a favor' : 'Sin saldo pendiente'}</span>
        <strong>{data.movementCount === 0 ? 'No verificable' : formatLedgerMoney(data.balance)}</strong></div>
        <span className={styles.tag}>{data.folio.type === 'GUEST' ? 'Cuenta de huésped' : data.folio.type === 'MASTER' ? 'Cuenta maestra' : 'Cuenta de empresa'}</span></div>
      {data.movementCount === 0 && <p className={styles.warning}>No hay movimientos. Un folio vacío no acredita que la reserva esté pagada.</p>}
      {debt && <p className={styles.warning}>El saldo pendiente bloquea la salida. Si hay otros folios, todos deben tener un saldo verificable sin deuda.</p>}
      {data.folio.type !== 'GUEST' && <p className={styles.muted}>Este tipo de folio se consulta aquí; su gestión de pagos requiere el flujo comercial correspondiente.</p>}
      <div className={styles.header}><h3>Movimientos</h3><button className={styles.secondary} disabled={detail.isFetching || movements.isFetching}
        onClick={() => { void detail.refetch(); void movements.refetch(); }}><SvgIcon name="arrow" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Actualizar cuenta</button></div>
      {movements.isPending && <p role="status">Cargando movimientos…</p>}
      {movements.isError && <div><p className={styles.error} role="alert">No se pudieron cargar todos los movimientos.</p><button className={styles.secondary} onClick={() => void movements.refetch()}>Reintentar movimientos</button></div>}
      {movements.isSuccess && rows.length === 0 && <p className={styles.muted}>Todavía no hay movimientos contables.</p>}
      {rows.length > 0 && <div className={styles.tableWrap}><table><caption className={styles.srOnly}>Movimientos del folio seleccionado</caption><thead><tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Importe</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString('es-GT', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' })} UTC</td>
          <td>{row.description}</td><td>{row.kind === 'PAYMENT' ? 'Pago recibido' : row.kind === 'CHARGE' ? 'Cargo' : 'Ajuste'}</td>
          <td className={row.kind === 'PAYMENT' ? styles.credit : undefined}>{formatLedgerMoney(row.amount)}</td></tr>)}
      </tbody></table></div>}
      {movements.hasNextPage && <button className={styles.secondary} disabled={movements.isFetchingNextPage} onClick={() => void movements.fetchNextPage()}>Ver más movimientos</button>}
      {payable && <fieldset className={styles.fields} disabled={cashLocked || cardLocked}><legend>Forma de pago</legend><label><input type="radio" name={`payment-method-${folioId}`} checked={method==='cash'} onChange={()=>{setMethod('cash');setCardOpen(false);}}/> Efectivo</label>{props.stayId && <label><input type="radio" name={`payment-method-${folioId}`} checked={method==='card'} onChange={()=>{setMethod('card');setCardOpen(true);}} onClick={()=>{setMethod('card');setCardOpen(true);}}/> Tarjeta</label>}</fieldset>}
      {props.stayId && <StaffStayJourneyPanel propertyId={props.propertyId} reservationId={props.reservationId} stayId={props.stayId} actorId={props.actorId} sessionId={props.sessionId} financial active={method==='card'} paymentOpen={cardOpen} onOpenChange={setCardOpen} initialAmount={amount} onAmountChange={setAmount} disabled={cashLocked || detail.isFetching || detail.isError} onLockChange={setCardLocked} />}
      {payable && method==='cash' && !operation.pending && <form className={styles.form} onSubmit={review} noValidate>
        <h3>Registrar pago recibido</h3><p>Efectivo</p><p className={styles.muted}>Permite un abono o el pago total. Confirma que recibiste el dinero antes de registrarlo. Esta acción no cobra a una tarjeta.</p>
        <div className={styles.fields}><label className={styles.field}>Monto recibido ({data.folio.currency})<input ref={amountInput} inputMode="decimal" placeholder="Ej. 125.50" value={amount} disabled={locked}
          aria-invalid={Boolean(amountError)} aria-describedby={amountError ? 'folio-payment-amount-error' : undefined} onChange={e => { setAmount(e.target.value); setErrors({ ...errors, amount: undefined }); }} />
          {amountError && <span id="folio-payment-amount-error" className={styles.error}>{amountError}</span>}</label>
          <button type="button" className={styles.secondary} disabled={locked} onClick={() => { setAmount(data.balance.amount); setErrors({ ...errors, amount: undefined }); }}><SvgIcon name="check" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Usar saldo total</button></div>
        <label className={styles.field}>Descripción del pago<input ref={descriptionInput} value={description} maxLength={255} disabled={locked} aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'folio-payment-description-error' : undefined} onChange={e => { setDescription(e.target.value); setErrors({ ...errors, description: undefined }); }} />
          {errors.description && <span id="folio-payment-description-error" className={styles.error}>{errors.description}</span>}</label>
        <button ref={trigger} className={styles.primary} disabled={locked} type="submit"><SvgIcon name="check" style={{verticalAlign:'middle',marginInlineEnd:8}}/>Revisar pago</button>
      </form>}
    </>}
    {operation.pending && <div className={styles.warning}><strong>Registro pendiente de comprobar</strong><p>{formatLedgerMoney(operation.pending.payment.amount)} · {operation.pending.payment.description}</p>
      <p>Recupera el resultado con la misma referencia antes de registrar otro pago.</p>
      <button ref={trigger} className={styles.primary} disabled={operation.busy || !operation.ready} onClick={() => setConfirmation(operation.pending!.payment)}>Recuperar resultado del pago</button></div>}
    {operation.error && <p role="alert" className={styles.error}>{operation.error}</p>}
    {operation.notice && <p role="status" className={styles.success}>{operation.notice}</p>}
    {confirmation && <Modal title={operation.pending ? 'Recuperar registro de pago' : 'Confirmar pago recibido'} busy={operation.busy} onClose={close}
      footer={<><button className={styles.secondary} disabled={operation.busy} onClick={close}>Volver al folio</button>
        <button className={styles.primary} disabled={operation.busy} onClick={() => void confirm()}><SvgIcon name="check" style={{verticalAlign:'middle',marginInlineEnd:8}}/>{operation.busy ? 'Registrando…' : operation.pending ? 'Recuperar misma operación' : 'Confirmar pago recibido'}</button></>}>
      <div className={styles.confirm}><p>Folio <strong>{folioId.slice(0, 8)}</strong></p><p className={styles.confirmAmount}>{formatLedgerMoney(confirmation.amount)}</p>
        <p>{confirmation.description}</p><p>Este registro acredita dinero recibido por recepción. No realiza un cargo bancario ni cierra el folio.</p>
        {operation.error && <p role="alert" className={styles.error}>{operation.error}</p>}</div>
    </Modal>}
  </div>;
}
