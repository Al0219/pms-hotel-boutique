import { http, HttpResponse } from "msw";

import { guestAccessHandlers } from "./guest-access-handlers";

export const handlers = [
  ...guestAccessHandlers,
  http.get("http://pms.test/__msw/health", () => HttpResponse.json({ status: "ok" })),
  http.get("http://pms.test/__msw/missing", () => HttpResponse.text(null, { status: 404 })),
  http.get("http://pms.test/guest-accounts/:accountId", ({ params }) => HttpResponse.json({
    account_id: params.accountId,
    email: "guest@example.com",
    external_identities: [],
  })),
];
