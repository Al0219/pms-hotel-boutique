import type { NextRequest } from 'next/server';
import { mutateStaffInventory } from '../../inventory-proxy';

export async function PATCH(request: NextRequest, context: { params: Promise<{ roomTypeId: string }> }) {
  const { roomTypeId } = await context.params;
  return mutateStaffInventory(request, 'room-types', roomTypeId);
}
