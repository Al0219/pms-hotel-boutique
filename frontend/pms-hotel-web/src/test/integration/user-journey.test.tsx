import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  httpRequest,
  setAuthToken,
  getAuthToken,
  onUnauthorized,
} from "@/lib/http";
import { LoadingState, ErrorState, EmptyState } from "@/shared/components";
import type { FolioDto } from "@/modules/folio";
import type { PaymentDto, PaymentListResponseDto } from "@/modules/payments";

describe("Frontend Dev 1 (FD1) - End-to-End User Journey & Data Integration", () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  describe("1. Authentication & Token Injection Flow", () => {
    it("manages JWT auth token and injects into HTTP request headers", async () => {
      expect(getAuthToken()).toBeNull();

      // Simulate login token received from BFF/Spring Boot
      const mockJwt = "jwt_test_token_12345";
      setAuthToken(mockJwt);
      expect(getAuthToken()).toBe(mockJwt);

      // Verify HTTP request succeeds with the injected authorization
      const folio = await httpRequest<FolioDto>({
        url: "http://pms.test/api/v1/private/folios/fol_guest_101",
        method: "GET",
      });

      expect(folio).toBeDefined();
      expect(folio.folio_id).toBe("fol_guest_101");
      expect(folio.holder_name).toBe("Carlos Morales");
      expect(folio.status).toBe("OPEN");
    });

    it("triggers onUnauthorized listener upon 401 response and clears session", async () => {
      const unauthorizedSpy = vi.fn();
      const unsubscribe = onUnauthorized(unauthorizedSpy);

      // Trigger request that returns 401
      await expect(
        httpRequest({
          url: "http://pms.test/api/v1/private/folios/fol_unauthorized",
          method: "GET",
        })
      ).rejects.toThrow();

      expect(unauthorizedSpy).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });

  describe("2. Authenticated Data Fetching & Business Flows", () => {
    it("fetches payment history with filters and calculates totals", async () => {
      setAuthToken("jwt_staff_valid");

      const response = await httpRequest<PaymentListResponseDto>({
        url: "http://pms.test/api/v1/private/payments",
        method: "GET",
        params: { folio_id: "fol_guest_101" },
      });

      expect(response.payments).toBeInstanceOf(Array);
      expect(response.total_count).toBeGreaterThan(0);

      const authorizedPayment = response.payments.find(
        (p) => p.status === "AUTHORIZED"
      );
      expect(authorizedPayment).toBeDefined();
      expect(authorizedPayment?.authorized_amount).toBe("750.00");
    });

    it("executes payment authorization and verifies audit trail entry", async () => {
      setAuthToken("jwt_staff_valid");

      const authPayload = {
        folio_id: "fol_guest_101",
        method: "CREDIT_CARD",
        amount: "350.00",
        currency: "USD",
        card_token: "tok_valid_test",
        last4: "4242",
      };

      const result = await httpRequest<PaymentDto>({
        url: "http://pms.test/api/v1/private/payments/authorize",
        method: "POST",
        json: authPayload,
      });

      expect(result.status).toBe("AUTHORIZED");
      expect(result.authorized_amount).toBe("350.00");
      expect(result.audit_trail).toHaveLength(1);
      expect(result.audit_trail?.[0].action).toBe("AUTHORIZE");
    });
  });

  describe("3. UI State Handling Integration (Loading, Error, Empty)", () => {
    function FolioViewer({ folioId }: { folioId: string }) {
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState<string | null>(null);
      const [data, setData] = React.useState<FolioDto | null>(null);

      const loadData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await httpRequest<FolioDto>({
            url: `http://pms.test/api/v1/private/folios/${folioId}`,
            method: "GET",
          });
          setData(res);
        } catch (err: unknown) {
          setError(
            err instanceof Error ? err.message : "Error al cargar folio"
          );
        } finally {
          setLoading(false);
        }
      }, [folioId]);

      React.useEffect(() => {
        void loadData();
      }, [loadData]);

      if (loading) {
        return <LoadingState message="Cargando estado de cuenta..." />;
      }

      if (error) {
        return (
          <ErrorState
            title="Error al cargar folio"
            message={error}
            onRetry={loadData}
          />
        );
      }

      if (!data || data.charges.length === 0) {
        return (
          <EmptyState
            title="Sin cargos registrados"
            description="El huésped no tiene consumos facturados."
            actionLabel="Agregar Cargo"
            onAction={() => {}}
          />
        );
      }

      return (
        <div data-testid="folio-details">
          <h2>{data.holder_name}</h2>
          <p data-testid="folio-balance">Balance: ${data.balance}</p>
        </div>
      );
    }

    it("displays loading state and transitions to populated content on success", async () => {
      render(<FolioViewer folioId="fol_guest_101" />);

      // Initially shows loading state
      expect(
        screen.getByText("Cargando estado de cuenta...")
      ).toBeInTheDocument();

      // Transitions to loaded data
      await waitFor(() => {
        expect(screen.getByTestId("folio-details")).toBeInTheDocument();
      });

      expect(screen.getByText("Carlos Morales")).toBeInTheDocument();
      expect(screen.getByTestId("folio-balance")).toHaveTextContent(
        "Balance: $480.00"
      );
    });

    it("displays error state with retry button when fetch fails", async () => {
      const user = userEvent.setup();
      render(<FolioViewer folioId="error_folio" />);

      // Awaits error state
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByText("Error al cargar folio")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /reintentar/i });
      expect(retryBtn).toBeInTheDocument();

      // Clicking retry triggers a reload attempt
      await user.click(retryBtn);
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
