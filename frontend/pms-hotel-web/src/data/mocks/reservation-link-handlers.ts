import { delay, http, HttpResponse } from 'msw';
import { reservationLinkDemo } from '@/modules/account/content/reservation-link-demo';
import { peekAccountFixture } from './account-fixtures';
import { reservationLinkChallenges, unlinkedReservationFixtures } from './reservation-link-fixtures';

/** Mock HTTP only. No email, Google verification, Backend connection or persistent reservation. */
export const reservationLinkHandlers = [
  http.post('http://pms.test/__mock/reservation-links/challenges', async ({ request }) => {
    const input = await request.json() as { account_id?: string; reference?: string };
    await delay(300);
    const account = typeof input.account_id === 'string' ? peekAccountFixture(input.account_id) : undefined;
    if (!account) return HttpResponse.json({ code: 'DEMO_ACCESS_REQUIRED' }, { status: 401 });
    if (typeof input.reference !== 'string' || !input.reference.trim() || input.reference.trim().length > 16) return HttpResponse.json({ code: 'INVALID_INPUT' }, { status: 400 });
    const id = crypto.randomUUID(); const expiresAt = Date.now() + 5 * 60_000;
    for (const challenge of reservationLinkChallenges.values()) if (challenge.accountId === account.accountId) challenge.used = true;
    reservationLinkChallenges.set(id, { accountId: account.accountId, email: account.accessEmail, reference: input.reference.trim().toUpperCase(), expiresAt, attempts: 0, used: false });
    // Same response for unknown references and different emails; never disclose a booking here.
    return HttpResponse.json({ account_id: account.accountId, request_id: id, expires_at: new Date(expiresAt).toISOString() }, { status: 202 });
  }),
  http.post('http://pms.test/__mock/reservation-links/verify', async ({ request }) => {
    const input = await request.json() as { account_id?: string; request_id?: string; otp?: string };
    await delay(300);
    const account = typeof input.account_id === 'string' ? peekAccountFixture(input.account_id) : undefined;
    const challenge = typeof input.request_id === 'string' ? reservationLinkChallenges.get(input.request_id) : undefined;
    const rejected = () => HttpResponse.json({ code: 'VERIFICATION_FAILED' }, { status: 422 });
    if (request.signal.aborted || !account || !challenge || challenge.used || challenge.accountId !== account.accountId || challenge.email !== account.accessEmail) return rejected();
    if (challenge.expiresAt <= Date.now()) return HttpResponse.json({ code: 'CHALLENGE_EXPIRED' }, { status: 410 });
    if (challenge.attempts >= 5) return HttpResponse.json({ code: 'ATTEMPTS_EXHAUSTED' }, { status: 429 });
    challenge.attempts++;
    const reservation = unlinkedReservationFixtures.find(item => item.reservation_id === challenge.reference);
    if (!reservation || account.accessEmail !== reservationLinkDemo.email || input.otp !== reservationLinkDemo.otp) return rejected();
    challenge.used = true;
    if (!account.reservations.some(item => item.reservation_id === reservation.reservation_id)) account.reservations.push(structuredClone(reservation));
    return HttpResponse.json({ account_id: account.accountId, request_id: input.request_id, reservation_id: reservation.reservation_id });
  }),
];
