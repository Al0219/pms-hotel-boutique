import { describe, expect, it } from "vitest";

import { HttpStatusError } from "./errors";
import { httpRequest } from "./client";

describe("httpRequest", () => {
  it("uses fetch to receive a technical mock response", async () => {
    await expect(httpRequest<{ status: string }>({ path: "http://pms.test/__msw/health" })).resolves.toEqual({ status: "ok" });
  });

  it("returns a typed status error", async () => {
    await expect(httpRequest({ path: "http://pms.test/__msw/missing" })).rejects.toBeInstanceOf(HttpStatusError);
  });
});
