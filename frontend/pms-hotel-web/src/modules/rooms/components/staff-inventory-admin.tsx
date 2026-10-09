'use client';
import { useState } from 'react';
import { EntityDataGrid } from '@/shared/components';
import workspace from '@/shared/components/entity-workspace.module.css';
import styles from './staff-inventory-admin.module.css';
import { useRoomCatalog } from '../hooks/use-room-catalog';
import { StaffInventoryCell } from './staff-inventory-cell';
import { StaffInventoryCreate } from './staff-inventory-create';

export function StaffInventoryAdmin({ propertyId, sessionId, canManage }: { propertyId: string; sessionId: string; canManage: boolean }) {
  const { query } = useRoomCatalog(propertyId, sessionId);
  const [tab, setTab] = useState<'rooms' | 'types'>('rooms'), [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false), [notice, setNotice] = useState('');
  if (query.fetchStatus === 'paused') return <p role="status">Sin conexión. Esperando para cargar el catálogo.</p>;
  if (query.isPending) return <p role="status">Cargando catálogo de habitaciones…</p>;
  if (query.isError || !query.data) return <section className={workspace.page}><p role="alert">No pudimos cargar el catálogo de esta propiedad.</p><button className={workspace.button} onClick={() => void query.refetch()}>Reintentar</button></section>;
  const data = query.data, normalized = search.trim().toLocaleLowerCase('es');
  const rooms = data.rooms.filter(room => `${room.code} ${data.types.find(type => type.id === room.roomTypeId)?.name}`.toLocaleLowerCase('es').includes(normalized));
  const types = data.types.filter(type => `${type.code} ${type.name}`.toLocaleLowerCase('es').includes(normalized));
  const shortId = (id: string) => <small title={id}>ID: {id.slice(0, 8)}…</small>;
  return <section className={workspace.page}>
    <div className={styles.controls}>
      <h2 className={styles.title}>Administrar habitaciones</h2>
      <div className={workspace.actions}>
        <button className={workspace.button} onClick={() => void query.refetch()} disabled={query.isFetching}>Actualizar catálogo</button>
        {canManage && !creating && <button className={workspace.button} onClick={() => { setCreating(true); setNotice(''); }}>{tab === 'rooms' ? 'Nueva habitación' : 'Nuevo tipo'}</button>}
      </div>
    </div>
    <div className={styles.tabs} role="tablist" aria-label="Catálogo de inventario">
      {(['rooms', 'types'] as const).map(value => <button className={workspace.button} key={value} id={`catalog-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="catalog-panel"
        disabled={creating} onClick={() => { setTab(value); setSearch(''); setNotice(''); }}>{value === 'rooms' ? 'Habitaciones físicas' : 'Tipos de habitación'}</button>)}
    </div>
    {creating && canManage && <StaffInventoryCreate resource={tab === 'rooms' ? 'room' : 'type'} propertyId={propertyId} sessionId={sessionId} types={data.types}
      onClose={() => setCreating(false)} onCreated={() => { setCreating(false); setSearch(''); setNotice('Creación confirmada. El inventario está actualizado.'); }} />}
    {notice && <p role="status" className={workspace.success}>{notice}</p>}
    <div id="catalog-panel" role="tabpanel" aria-labelledby={`catalog-tab-${tab}`}>
      <div className={workspace.filters}><div className={workspace.toolbar}>
        <label className={workspace.searchField}>Buscar en el catálogo<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Código o nombre" /></label>
        <button className={workspace.button} disabled={!search} onClick={() => setSearch('')}>Limpiar filtros</button>
      </div></div>
      <div className={workspace.tableRegion}>
        {tab === 'rooms' ? <EntityDataGrid label="Habitaciones físicas" rows={rooms} getRowKey={room => room.id} minWidth={680} readOnly={!canManage} emptyState="No hay registros con estos criterios." columns={[
          { key: 'identity', header: 'Identidad', render: room => <div className={workspace.group}><strong>Habitación {room.code}</strong>{shortId(room.id)}</div>,
            renderEditor: room => <div className={workspace.group}><StaffInventoryCell propertyId={propertyId} sessionId={sessionId} id={room.id} value={room.code} resource="room" field="code" displayValue={<strong>Habitación {room.code}</strong>} />{shortId(room.id)}</div> },
          { key: 'context', header: 'Contexto', render: room => <div className={workspace.group}><span>{data.types.find(type => type.id === room.roomTypeId)?.name}</span><small>{propertyId}</small></div> },
          { key: 'relation', header: 'Relación', render: () => <span>Consultar en Tablero operativo</span> },
          { key: 'state', header: 'Estado', render: () => <small>Estado operativo no disponible</small> },
        ]} /> : <EntityDataGrid label="Tipos de habitación" rows={types} getRowKey={type => type.id} minWidth={480} readOnly={!canManage} emptyState="No hay registros con estos criterios." columns={[
          { key: 'identity', header: 'Identidad', render: type => <div className={workspace.group}><strong>{type.code}</strong>{shortId(type.id)}</div>,
            renderEditor: type => <div className={workspace.group}><StaffInventoryCell propertyId={propertyId} sessionId={sessionId} id={type.id} value={type.code} resource="type" field="code" displayValue={<strong>{type.code}</strong>} />{shortId(type.id)}</div> },
          { key: 'context', header: 'Contexto', render: type => <div className={workspace.group}><span>{type.name}</span><small>{propertyId}</small></div>,
            renderEditor: type => <div className={workspace.group}><StaffInventoryCell propertyId={propertyId} sessionId={sessionId} id={type.id} value={type.name} resource="type" field="name" /><small>{propertyId}</small></div> },
        ]} />}
      </div>
    </div>
  </section>;
}
