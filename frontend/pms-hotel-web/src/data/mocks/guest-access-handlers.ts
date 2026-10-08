import { delay, http, HttpResponse } from "msw";
import type { GuestAccountDTO } from "@/modules/auth/dtos/guest-account.dto";
import { initializeAccountFixture, peekAccountFixture } from "./account-fixtures";

/** Frontend-only fixtures for IMP-WEB-0202. No authentication or Backend API contract. */
export const guestAccessHandlers = [
  http.post("http://pms.test/__mock/guest-access", async ({ request }) => {
    const input = await request.json() as { method?: string; email?: unknown; registration?: { fullName?: unknown } };
    await delay(400);
    if (input.method !== "EMAIL" && input.method !== "GOOGLE") {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    if (input.method === "EMAIL" && (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))) {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    if (input.registration && (input.method !== 'EMAIL' || typeof input.registration.fullName !== 'string' || input.registration.fullName.trim().length < 3 || input.registration.fullName.trim().split(/\s+/).length < 2)) {
      return HttpResponse.json({ code: 'INVALID_ACCESS_REQUEST' }, { status: 400 });
    }
    const email = input.method === "EMAIL" ? (input.email as string).trim() : "guest.google@example.com";
    if (email.toLowerCase() === "error@example.com") {
      return HttpResponse.json({ code: "ACCESS_UNAVAILABLE" }, { status: 503 });
    }
    if (email.toLowerCase() === "offline@example.com") return HttpResponse.error();
    const scenarios: Record<string, string> = { "empty@example.com": "guest-demo-empty", "data-error@example.com": "guest-demo-data-error", "data-offline@example.com": "guest-demo-data-offline", "save-error@example.com": "guest-demo-save-error" };
    const registeredAccount = peekAccountFixture('guest-demo-register');
    const accountId = input.method === 'GOOGLE' ? 'guest-demo-google'
      : input.registration || registeredAccount?.accessEmail.toLowerCase() === email.toLowerCase() ? 'guest-demo-register'
      : scenarios[email.toLowerCase()] ?? "guest-demo-01";
    if (peekAccountFixture(accountId)?.accessEmail.toLowerCase() !== email.toLowerCase()) initializeAccountFixture(accountId, email);
    if (input.registration) {
      const fixture = initializeAccountFixture(accountId, email);
      const [firstName, ...lastName] = (input.registration.fullName as string).trim().split(/\s+/);
      fixture.profile.first_name = firstName;
      fixture.profile.last_name = lastName.join(' ');
    }
    const account: GuestAccountDTO = {
      account_id: accountId,
      email,
      external_identities: input.method === "GOOGLE" ? [{ provider: "GOOGLE", external_subject: "google-demo-01", connected_at: "2026-09-23T12:00:00.000Z" }] : [],
    };
    return HttpResponse.json(account);
  }),
];
