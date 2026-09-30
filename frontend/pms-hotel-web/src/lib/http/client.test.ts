import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { mockServer } from "@/data/mocks/server";

import { HttpStatusError } from "./errors";
import { httpRequest } from "./client";

describe("httpRequest", () => {
  it("uses fetch to receive a technical mock response", async () => {
    await expect(httpRequest<{ status: string }>({ path: "http://pms.test/__msw/health" })).resolves.toEqual({ status: "ok" });
  });

  it("returns a typed status error", async () => {
    await expect(httpRequest({ path: "http://pms.test/__msw/missing" })).rejects.toBeInstanceOf(HttpStatusError);
  });

  it("supports an empty successful response for BFF logout", async () => {
    mockServer.use(http.delete("http://pms.test/__msw/session", () => new HttpResponse(null, { status: 204 })));
    await expect(httpRequest<void>({ path: "http://pms.test/__msw/session", method: "DELETE" })).resolves.toBeUndefined();
  });
});
