'use client';
import { EditableCell } from '@/shared/components/editable-cell';
import { useStaffInventoryMutation } from '../hooks/use-staff-inventory-mutation';
import { inventoryErrorMessage } from '../model/inventory-error';

export function StaffInventoryCell({ propertyId, sessionId, id, value, field, resource, displayValue }: {
  propertyId: string; sessionId: string; id: string; value: string; field: 'code' | 'name'; resource: 'room' | 'type'; displayValue?: React.ReactNode;
}) {
  const mutation = useStaffInventoryMutation(propertyId, sessionId);
  const label = `${field === 'code' ? 'código' : 'nombre'} ${resource === 'room' ? 'de habitación' : 'del tipo'} ${value}`;
  return <EditableCell value={value} displayValue={displayValue} label={label} maxLength={field === 'code' ? 64 : 160} getError={inventoryErrorMessage}
    onSave={next => mutation.mutateAsync(resource === 'room' ? { kind: 'edit-room', id, code: next } : { kind: 'edit-type', id, [field]: next })} />;
}
