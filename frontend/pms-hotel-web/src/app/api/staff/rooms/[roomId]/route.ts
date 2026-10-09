import type { NextRequest } from 'next/server';
import { mutateStaffInventory } from '../../inventory-proxy';

export async function PATCH(request: NextRequest, context: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await context.params;
  return mutateStaffInventory(request, 'rooms', roomId);
}
