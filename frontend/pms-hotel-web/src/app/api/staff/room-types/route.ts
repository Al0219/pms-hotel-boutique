import type { NextRequest } from 'next/server';
import { proxyStaffInventory, mutateStaffInventory } from '../inventory-proxy';

export function GET(request: NextRequest) { return proxyStaffInventory(request, 'room-types'); }

export function POST(request: NextRequest) { return mutateStaffInventory(request, 'room-types'); }
