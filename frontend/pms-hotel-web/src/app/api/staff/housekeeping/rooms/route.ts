import { NextRequest } from 'next/server';
import { proxyHousekeeping } from '../proxy';
export function GET(request: NextRequest) { return proxyHousekeeping(request); }
