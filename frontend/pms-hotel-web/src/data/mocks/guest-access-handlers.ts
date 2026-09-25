import { delay, http, HttpResponse } from "msw";
import type { GuestAccountDTO } from "@/modules/auth/dtos/guest-account.dto";
import { initializeAccountFixture } from "./account-fixtures";

/** Frontend-only fixtures for IMP-WEB-0202. No authentication or Backend API contract. */
export const guestAccessHandlers = [
  http.post("http://pms.test/__mock/guest-access", async ({ request }) => {
    const input = await request.json() as { method?: string; email?: unknown };
    await delay(400);
    if (input.method !== "EMAIL" && input.method !== "GOOGLE") {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    if (input.method === "EMAIL" && (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))) {
      return HttpResponse.json({ code: "INVALID_ACCESS_REQUEST" }, { status: 400 });
    }
    const email = input.method === "EMAIL" ? (input.email as string).trim() : "guest.google@example.com";
    if (email.toLowerCase() === "error@example.com") {
      return HttpResponse.json({ code: "ACCESS_UNAVAILABLE" }, { status: 503 });
    }
    if (email.toLowerCase() === "offline@example.com") return HttpResponse.error();
    const scenarios: Record<string, string> = { "empty@example.com": "guest-demo-empty", "data-error@example.com": "guest-demo-data-error", "data-offline@example.com": "guest-demo-data-offline", "save-error@example.com": "guest-demo-save-error" };
    const accountId = scenarios[email.toLowerCase()] ?? "guest-demo-01";
    initializeAccountFixture(accountId, email);
    const account: GuestAccountDTO = {
      account_id: accountId,
      email,
      external_identities: input.method === "GOOGLE" ? [{ provider: "GOOGLE", external_subject: "google-demo-01", connected_at: "2026-09-23T12:00:00.000Z" }] : [],
    };
    return HttpResponse.json(account);
  }),
];
