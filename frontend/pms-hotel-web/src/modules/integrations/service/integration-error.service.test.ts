import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { mockServer } from "@/data/mocks/server";
import { HttpStatusError } from "@/lib/http/errors";

import { listIntegrationErrors, retryIntegrationError } from "./integration-error.service";

const ENDPOINT = "http://pms.test/contract/integration-errors";

const ERROR_DTO = {
  error_id: "ERR-001",
  property_id: "GT-HB-01",
  integration_id: "INT-002",
  integration_provider: "Expedia",
  kind: "reservation_import",
  message: "Reserva rechazada por tarifa desactualizada.",
  status: "PENDING",
  attempts: 1,
  max_attempts: 3,
  retryable: true,
  last_attempt_at: null,
  history: [],
};

describe("listIntegrationErrors", () => {
  it("lists queued errors preserving the property scope", async () => {
    mockServer.use(
      http.get("http://pms.test/contract/integration-errors", ({ request }) => {
        expect(new URL(request.url).searchParams.get("propertyId")).toBe("GT-HB-01");
        return HttpResponse.json({ errors: [ERROR_DTO] });
      }),
    );

    await expect(
      listIntegrationErrors({ endpoint: ENDPOINT, propertyId: "GT-HB-01" }),
    ).resolves.toEqual({ errors: [ERROR_DTO] });
  });
});

describe("retryIntegrationError", () => {
  it("POSTs the retry with its idempotency key", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/integration-errors/:errorId/retry", async ({ request, params }) => {
        expect(params.errorId).toBe("ERR-001");
        const body = (await request.json()) as { idempotency_key: string };
        expect(body).toEqual({ idempotency_key: "key-123" });

        return HttpResponse.json({ ...ERROR_DTO, status: "RESOLVED", attempts: 2 });
      }),
    );

    await expect(
      retryIntegrationError({ endpoint: ENDPOINT, propertyId: "GT-HB-01", errorId: "ERR-001", idempotencyKey: "key-123" }),
    ).resolves.toMatchObject({ error_id: "ERR-001", status: "RESOLVED" });
  });

  it("surfaces non-retryable rejections to the hook", async () => {
    mockServer.use(
      http.post("http://pms.test/contract/integration-errors/:errorId/retry", () =>
        HttpResponse.json({ error: "NON_RETRYABLE" }, { status: 422 }),
      ),
    );

    await expect(
      retryIntegrationError({ endpoint: ENDPOINT, propertyId: "GT-HB-01", errorId: "ERR-002", idempotencyKey: "key-124" }),
    ).rejects.toBeInstanceOf(HttpStatusError);
  });
});
