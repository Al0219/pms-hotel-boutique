import type { NextRequest } from 'next/server';
import { proxyStaffInventory, mutateStaffInventory } from '../inventory-proxy';

export function GET(request: NextRequest) { return proxyStaffInventory(request, 'rooms'); }

export function POST(request: NextRequest) { return mutateStaffInventory(request, 'rooms'); }
