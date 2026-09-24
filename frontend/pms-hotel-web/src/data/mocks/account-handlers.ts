import { delay, http, HttpResponse } from "msw";
import { getAccountFixture, summarizeAccount } from "./account-fixtures";
import type { GuestProfileDTO } from "@/modules/profile/dtos/profile.dto";

async function resolveAccount(request: Request) {
  await delay(180);
  const id = new URL(request.url).searchParams.get("accountId");
  if (id === "guest-demo-data-error") return HttpResponse.json({ code: "DEMO_ERROR" }, { status: 503 });
  if (id === "guest-demo-data-offline") return HttpResponse.error();
  return getAccountFixture(id) ?? HttpResponse.json({ code: "ACCOUNT_UNAVAILABLE" }, { status: 404 });
}
export const accountHandlers = [
  http.get("http://pms.test/account/summary", async ({ request }) => { const data = await resolveAccount(request); return data instanceof Response ? data : HttpResponse.json(summarizeAccount(data)); }),
  http.get("http://pms.test/account/history", async ({ request }) => { const data = await resolveAccount(request); return data instanceof Response ? data : HttpResponse.json({ account_id: data.accountId, reservations: data.reservations }); }),
  http.get("http://pms.test/profile/:profileId", async ({ request, params }) => {
    const data = await resolveAccount(request);
    if (data instanceof Response) return data;
    if (params.profileId !== data.profile.profile_id) return HttpResponse.json({ code: "PROFILE_UNAVAILABLE" }, { status: 404 });
    return HttpResponse.json(data.profile);
  }),
  http.post("http://pms.test/profile/update", async ({ request }) => {
    const data = await resolveAccount(request);
    if (data instanceof Response) return data;
    if (data.accountId === "guest-demo-save-error") return HttpResponse.json({ code: "SAVE_FAILED" }, { status: 503 });
    const input = await request.json() as GuestProfileDTO;
    if (input.profile_id !== data.profile.profile_id) return HttpResponse.json({ code: "PROFILE_UNAVAILABLE" }, { status: 404 });
    if (![input.first_name, input.last_name, input.email, input.phone, input.country, input.preferred_language].every(value => typeof value === "string" && value.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || !/^\+[\d ()-]{7,20}$/.test(input.phone)) return HttpResponse.json({ code: "INVALID_PROFILE" }, { status: 422 });
    const preferences = input.preferences;
    if (!preferences || !["King", "Queen", "Twin"].includes(preferences.bed_type) || !["tranquila", "vista exterior", "cerca de elevador"].includes(preferences.room_vibe) || !["Piso alto · evitar zonas ruidosas", "Piso bajo"].includes(preferences.floor_preference) || !["Español", "English"].includes(input.preferred_language)) return HttpResponse.json({ code: "INVALID_PREFERENCES" }, { status: 422 });
    // Whitelist editable contact/preferences fields; preserve privacy and account identity.
    data.profile = { ...data.profile, first_name: input.first_name.trim(), last_name: input.last_name.trim(), email: input.email.trim(), phone: input.phone.trim(), country: input.country.trim(), preferred_language: input.preferred_language,
      preferences: { ...data.profile.preferences, bed_type: preferences.bed_type, room_vibe: preferences.room_vibe, floor_preference: preferences.floor_preference } };
    return HttpResponse.json(data.profile);
  }),
  http.get("http://pms.test/rewards", async ({ request }) => { const data = await resolveAccount(request); return data instanceof Response ? data : HttpResponse.json(data.rewards); }),
  http.get("http://pms.test/promotions", async ({ request }) => { const data = await resolveAccount(request); return data instanceof Response ? data : HttpResponse.json(data.promotions); }),
  http.get("http://pms.test/__mock/account/invoices", async ({ request }) => { const data = await resolveAccount(request); return data instanceof Response ? data : HttpResponse.json({ account_id: data.accountId, invoices: data.invoices }); }),
];
