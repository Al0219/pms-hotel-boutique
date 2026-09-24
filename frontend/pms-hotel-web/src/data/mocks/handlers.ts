import { http, HttpResponse } from "msw";
import { private07Handlers } from "./private-07";

export const handlers = [
  ...private07Handlers,
  http.get("http://pms.test/__msw/health", () => HttpResponse.json({ status: "ok" })),
  http.get("http://pms.test/__msw/missing", () => HttpResponse.text(null, { status: 404 })),
  http.get("http://pms.test/guest-accounts/:accountId", ({ params }) => HttpResponse.json({
    account_id: params.accountId,
    email: "guest@example.com",
    external_identities: [],
  })),
];
