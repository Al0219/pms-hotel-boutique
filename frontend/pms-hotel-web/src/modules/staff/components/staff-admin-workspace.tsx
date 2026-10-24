'use client';
import { useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import { useStaffSession, type StaffSession } from '@/modules/auth';
import { usePropertyScope, type PropertyScope } from '@/modules/properties';
import { Button, ConfirmDialog, EntityDataGrid, EntityFilterField, EntityListSurface, EntityPagination, StatusBadge } from '@/shared/components';
import { HttpStatusError } from '@/lib/http/errors';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { staffAdminIdentity, useStaffAdmin, useStaffAdminDetail } from '../hooks/use-staff-admin';
import { initialFilters, statusLabels, type StaffAdminFilters, type StaffAdminUser } from '../model/staff-admin';
import { useStaffInlineEdit } from '../hooks/use-staff-inline-edit';
import { StaffStatusActions } from './staff-status-actions';
import { StaffAdminRow } from './staff-admin-row';
import { staffStatusActions } from '../model/staff-admin-edit';
import { StaffInlineGroup } from './staff-inline-group';
import { StaffAdminAccessBoundary } from './staff-admin-access-boundary';
import styles from './staff-admin.module.css';

type Props = { initial?: Partial<StaffAdminFilters> };
export function StaffAdminWorkspace(props: Props) {
  return <StaffAdminAccessBoundary><AuthorizedWorkspace {...props} /></StaffAdminAccessBoundary>;
}
function AuthorizedWorkspace(props: Props) {
  const session = useStaffSession(), property = usePropertyScope();
  if (!session.staffUserId) return <Notice title="Inicia una sesión Staff real">La administración de usuarios requiere autenticación real; no está disponible en la vista previa.</Notice>;
  if (!property.ready) return <p role="status">Preparando el contexto Staff…</p>;
  if (!property.scope) return <Notice title="Selecciona una propiedad">Utiliza el selector del menú Staff para elegir una propiedad autorizada o todas tus propiedades.</Notice>;
  return <AdminContent key={`${staffAdminIdentity(session)}:${JSON.stringify(property.scope)}`} session={session} scope={property.scope} registerSelectionGuard={property.registerSelectionGuard} {...props} />;
}
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.notice}><h1>{title}</h1><p>{children}</p></section>;
}
function ReadError({ error, retry, restart }: { error: unknown; retry: () => void; restart: () => void }) {
  const status = error instanceof HttpStatusError ? error.status : undefined;
  const body = error instanceof HttpStatusError ? error.responseData : undefined;
  const cursor = status === 400 && !!body && typeof body === 'object' && 'code' in body && body.code === 'INVALID_CURSOR';
  const message = status === 401 ? 'Tu sesión Staff ha caducado. Verificando el acceso…'
    : status === 403 ? 'No tienes permiso para consultar esta información.'
    : status === 404 ? 'El usuario no existe o no está disponible para tu acceso actual.'
    : cursor ? 'La paginación ha caducado o ya no corresponde a esta consulta.'
    : status === 400 ? 'La consulta no es válida. Revisa la búsqueda y los filtros.'
    : error instanceof DomainMappingError ? 'La información recibida no corresponde al contexto autorizado. Actualiza la consulta.'
    : status === 503 ? 'El servicio de usuarios no está disponible temporalmente.'
    : 'No se pudieron cargar los usuarios. Comprueba tu conexión e inténtalo nuevamente.';
  return <div className={styles.notice}><p role="alert">{message}</p>
    {cursor ? <Button variant="outline" onClick={restart}>Volver al inicio del listado</Button>
      : status !== 401 && status !== 403 && status !== 404 && <Button variant="outline" onClick={retry}>Reintentar</Button>}
  </div>;
}
function Status({ user }: { user: StaffAdminUser }) {
  return <StatusBadge size="sm" variant={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'warning' : 'neutral'}>{statusLabels[user.status]}</StatusBadge>;
}
function propertyName(session: StaffSession, id: string) { return session.memberships.find(item => item.active && item.propertyId === id)?.name ?? 'Propiedad autorizada'; }
function AdminContent({ session, scope, initial, registerSelectionGuard }: Props & { session: StaffSession; scope: PropertyScope; registerSelectionGuard?: (guard: (proceed: () => void) => void) => () => void }) {
  const [filters, setFilters] = useState<StaffAdminFilters>({ ...initialFilters, ...initial });
  const [input, setInput] = useState(filters.username);
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const cursor = history[history.length - 1];
  const [visited, setVisited] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [scopeChange, setScopeChange] = useState<(() => void) | null>(null);
  const [scopeNotice, setScopeNotice] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (input !== filters.username) { setFilters(current => ({ ...current, username: input })); setHistory([null]); setExpanded(null); }
    }, 350);
    return () => clearTimeout(timeout);
  }, [input, filters.username]);
  const { context, query, loading, error, retry } = useStaffAdmin(session, scope, filters, cursor, !blocked);
  const editor = useStaffInlineEdit(session, scope, context.data?.organizationId, () => { setHistory([null]); if (cursor === null) void query.refetch(); }, () => setBlocked(true));
  useEffect(() => registerSelectionGuard?.(proceed => {
    if (!editor.active) { proceed(); return; }
    if (editor.busy || editor.state?.phase === 'uncertain') { setScopeNotice('Comprueba el resultado de esta cuenta antes de cambiar de propiedad.'); return; }
    setScopeChange(() => proceed);
  }), [registerSelectionGuard, editor.active, editor.busy, editor.state?.phase]);
  const change = (field: keyof StaffAdminFilters, value: string | number) => { setFilters(current => ({ ...current, [field]: value })); setHistory([null]); setExpanded(null); };
  const unsafe = error instanceof DomainMappingError || (error instanceof HttpStatusError && [401, 403, 404].includes(error.status));
  const preservingDraft = editor.active && editor.state?.user.organizationId === context.data?.organizationId && !unsafe;
  const page = preservingDraft ? query.data : !context.isFetching && !context.isError && !error && (!query.isFetching || query.isPlaceholderData || !!editor.state) ? query.data : undefined;
  const editedUser = editor.active ? editor.state?.remote ?? editor.state?.user : undefined;
  const rows = page && preservingDraft && editedUser && !page.users.some(user => user.id === editedUser.id) ? [editedUser, ...page.users] : page?.users ?? [];
  const pendingSearch = input !== filters.username;
  const updating = pendingSearch || context.isFetching || query.isPlaceholderData || (query.isFetching && !!page);
  const offline = context.fetchStatus === 'paused' || query.fetchStatus === 'paused';
  const toggle = (id: string) => {
    if (editor.active || updating) return;
    setVisited(current => current.includes(id) ? current : [...current, id]);
    setExpanded(current => current === id ? null : id);
  };
  const activateEditor = (id: string) => { setVisited(current => current.includes(id) ? current : [...current, id]); setExpanded(id); };
  const rowClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (editor.active || updating || event.defaultPrevented || window.getSelection()?.toString()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, select, textarea, button, a, summary, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="slider"], [role="combobox"], [role="textbox"], [contenteditable]:not([contenteditable="false"]), [data-staff-row-action]')) return;
    const control = event.currentTarget.querySelector<HTMLButtonElement>('[data-staff-expand]');
    control?.focus({ preventScroll: true });
    control?.click();
  };
  const restart = () => { setHistory([null]); if (cursor === null) retry(); };
  if (blocked || editor.accessLost) return <div className={styles.notice}><p role="status">Verificando tu acceso Staff…</p><Button onClick={() => window.location.reload()}>Volver a comprobar el acceso</Button></div>;
  return <div className={styles.page}>
    {scopeChange && <ConfirmDialog title="¿Descartar el borrador?" body="El cambio de propiedad descartará la edición sin guardar." confirmLabel="Descartar y cambiar" busyLabel="Cambiando…" onCancel={() => setScopeChange(null)} onConfirm={() => { editor.cancel(); setScopeChange(null); scopeChange(); }} />}
    {scopeNotice && <p role="status">{scopeNotice}</p>}
    {editor.notice && <p role="status">{editor.notice}</p>}
    {editor.state?.phase === 'idle' && editor.state.message && <p role="status">{editor.state.message}</p>}
    <header className={styles.header}><h1>Usuarios</h1></header>
    <EntityListSurface label="Administración de usuarios Staff" showScrollHint={false} filters={<>
      <EntityFilterField label="Buscar por username" search><input type="search" disabled={editor.active} maxLength={80} value={input} onChange={event => setInput(event.target.value)} placeholder="Username literal" /></EntityFilterField>
      <EntityFilterField label="Rol"><select disabled={editor.active} value={filters.roleCode} onChange={event => change('roleCode', event.target.value)}><option value="">Todos los roles</option>{context.data?.roles.map(role => <option key={role.code} value={role.code}>{role.name}</option>)}</select></EntityFilterField>
      <EntityFilterField label="Estado"><select disabled={editor.active} value={filters.status} onChange={event => change('status', event.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></EntityFilterField>
    </>} filterActions={<Button disabled={editor.active} variant="ghost" onClick={() => { setFilters(initialFilters); setInput(''); setHistory([null]); setExpanded(null); }}>Limpiar filtros</Button>}
      footer={<EntityPagination label="Paginación de usuarios" noun="usuarios"
        summary={updating ? 'Actualizando resultados…' : !page ? 'Resultados pendientes' : undefined}
        pagination={{ mode: 'cursor', page: history.length, pageSize: filters.limit,
          from: page?.users.length ? (history.length - 1) * filters.limit + 1 : 0,
          to: page?.users.length ? (history.length - 1) * filters.limit + page.users.length : 0,
          hasNext: !!page?.nextCursor, busy: loading || pendingSearch || editor.active,
          setPageSize: size => change('limit', size),
          setPage: next => {
            if (next === history.length) return;
            setExpanded(null);
            if (next >= 1 && next < history.length) setHistory(current => current.slice(0, next));
            else if (next === history.length + 1 && page?.nextCursor) setHistory(current => [...current, page.nextCursor]);
          },
        }} />}>
      {error && !preservingDraft ? <ReadError error={error} retry={retry} restart={restart} />
        : !page ? <p role="status">{offline ? 'Sin conexión. Esperando para cargar los usuarios.' : query.isPending ? 'Cargando usuarios…' : 'Actualizando usuarios…'}</p>
        : <div className={styles.grid} aria-busy={updating}><p className={styles.update} role="status" aria-label={updating ? "Actualizando resultados; mostrando la consulta anterior" : undefined}>{updating ? "Actualizando…" : ""}</p>{preservingDraft && error && <p role="status">No se pudo actualizar la consulta. Tu borrador se conserva.</p>}{preservingDraft && editedUser && !page.users.some(user => user.id === editedUser.id) && <p role="status">El usuario en edición no figura en estos resultados; comprueba su estado antes de continuar.</p>}<EntityDataGrid label="Usuarios Staff" rows={rows} getRowKey={user => user.id}
          emptyState={updating ? 'Actualizando resultados…' : filters.username || filters.roleCode || filters.status ? 'No existen coincidencias con estos filtros.' : 'No hay usuarios visibles en este contexto.'}
          columns={[
            { key: 'user', header: 'Usuario', render: user => <div className={styles.userCell}><div className={styles.group}><span className={styles.mobileLabel}>Usuario</span><strong>{user.username}</strong>{context.data && <StaffInlineGroup group="email" user={user} session={session} context={context.data} editor={editor} unavailable={pendingSearch || query.isPlaceholderData} activate={() => activateEditor(user.id)}><small>{user.workEmail || 'Sin correo laboral'}</small></StaffInlineGroup>}</div><button type="button" className={styles.expandControl} data-staff-expand id={`staff-more-${user.id}`} aria-label={`${expanded === user.id ? 'Contraer' : 'Expandir'} información de ${user.username}`} aria-expanded={!updating && expanded === user.id} aria-controls={visited.includes(user.id) ? `staff-details-${user.id}` : undefined} disabled={updating || editor.active} onClick={() => toggle(user.id)}><svg className={expanded === user.id ? styles.chevronOpen : styles.chevron} viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button></div> },
            { key: 'access', header: 'Acceso', render: user => <div className={styles.group}><span className={styles.mobileLabel}>Acceso</span>{context.data && <StaffInlineGroup group="role" user={user} session={session} context={context.data} editor={editor} unavailable={pendingSearch || query.isPlaceholderData} activate={() => activateEditor(user.id)}><strong>{context.data.roles.find(role => role.code === user.roleCode)?.name ?? user.roleCode}</strong></StaffInlineGroup>}<div className={styles.accessState}><Status user={user} /><StaffStatusActions user={user} session={session} editor={editor} revealed={revealed === user.id} reveal={show => setRevealed(show ? user.id : null)} unavailable={updating} activate={() => activateEditor(user.id)} /></div>{user.membershipStatus === 'INACTIVE' && <small>Membresía inactiva</small>}</div> },
            { key: 'assignment', header: 'Asignación', render: user => <div className={styles.group}><span className={styles.mobileLabel}>Asignación</span>{context.data && <StaffInlineGroup group="properties" user={user} session={session} context={context.data} editor={editor} unavailable={pendingSearch || query.isPlaceholderData} activate={() => activateEditor(user.id)}><strong>{user.propertyIds.length ? propertyName(session, user.propertyIds[0]) : 'Sin propiedades activas'}</strong>{user.propertyIds.length > 0 && <small>{user.propertyIds.length} {user.propertyIds.length === 1 ? 'propiedad asignada' : 'propiedades asignadas'}</small>}</StaffInlineGroup>}</div> },
          ]} renderReadOnlyRow={(user, cells) => <StaffAdminRow revealed={revealed === user.id} enabled={!editor.active && !updating && staffStatusActions(user, session).length > 0} onReveal={show => setRevealed(show ? user.id : null)} onClick={rowClick}>{cells}</StaffAdminRow>} renderExpandedRow={user => visited.includes(user.id) && context.data ? <tr className={styles.expandedRow} hidden={pendingSearch || query.isPlaceholderData || expanded !== user.id}><td colSpan={3}><div id={`staff-details-${user.id}`} role="region" aria-labelledby={`staff-more-${user.id}`}><ExpandedDetails session={session} scope={scope} organizationId={context.data.organizationId} id={user.id} active={!pendingSearch && !query.isPlaceholderData && expanded === user.id && !(editor.active && editor.state?.user.id === user.id)} /></div></td></tr> : null} /></div>}
    </EntityListSurface>
  </div>;
}
function ExpandedDetails({ session, scope, organizationId, id, active }: { session: StaffSession; scope: PropertyScope; organizationId: string; id: string; active: boolean }) {
  const query = useStaffAdminDetail(session, scope, organizationId, id, active);
  if (query.isError) return <ReadError error={query.error} retry={() => void query.refetch()} restart={() => void query.refetch()} />;
  if (query.isPending || query.isFetching) return <p role="status">{query.fetchStatus === 'paused' ? 'Sin conexión. Esperando para consultar la información.' : 'Cargando información adicional…'}</p>;
  const user = query.data;
  const formatDate = (value: string) => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(new Date(value));
  return <div className={styles.expanded}>
    {user.propertyIds.length > 1 && <div><strong>Propiedades asignadas</strong><ul>{user.propertyIds.map(propertyId => <li key={propertyId}>{propertyName(session, propertyId)}</li>)}</ul></div>}
    <dl><div><dt>Membresía de organización</dt><dd>{user.membershipStatus === 'ACTIVE' ? 'Activa' : 'Inactiva'}</dd></div>
      <div><dt>Creación</dt><dd><time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time></dd></div>
      <div><dt>Última actualización</dt><dd><time dateTime={user.updatedAt}>{formatDate(user.updatedAt)}</time></dd></div></dl>
  </div>;
}
