import { NextRequest } from 'next/server';
import { proxyStaffFolio } from './folio-proxy';
export function GET(request: NextRequest) { return proxyStaffFolio(request, 'list'); }
