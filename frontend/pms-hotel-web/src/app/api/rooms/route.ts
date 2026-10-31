import { GET as availabilityGet } from '../v1/public/availability/route';

export async function GET(request: Request) {
  return availabilityGet(request);
}
