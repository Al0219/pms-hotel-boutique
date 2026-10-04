import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSession } from "./use-session";
import { getAuthToken } from "@/lib/http";

describe("useSession hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads active session on mount and sets auth token in http client", async () => {
    const mockSession = {
      userId: "usr_rec_1",
      email: "staff@hotel.com",
      name: "Staff",
      role: "RECEPTION",
      propertyId: "prop_01",
      permissions: ["folio:view"],
      token: "jwt_token_abc_123",
      expiresAt: "2026-10-01T20:00:00Z",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session: mockSession }),
    } as Response);

    const { result } = renderHook(() => useSession());

    await act(async () => {});

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.isAuthenticated).toBe(true);
    expect(getAuthToken()).toBe("jwt_token_abc_123");
  });

  it("logs in successfully and updates token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ session: null }),
    } as Response);

    const { result } = renderHook(() => useSession());
    await act(async () => {});

    expect(result.current.isAuthenticated).toBe(false);

    const newSession = {
      userId: "usr_mgr_2",
      email: "manager@hotel.com",
      name: "Manager",
      role: "MANAGER",
      propertyId: "prop_01",
      permissions: ["revenue:view"],
      token: "jwt_mgr_token_456",
      expiresAt: "2026-10-01T20:00:00Z",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ session: newSession }),
    } as Response);

    await act(async () => {
      await result.current.login({ email: "manager@hotel.com", role: "MANAGER" });
    });

    expect(result.current.session).toEqual(newSession);
    expect(result.current.isAuthenticated).toBe(true);
    expect(getAuthToken()).toBe("jwt_mgr_token_456");
  });

  it("logs out and clears token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session: {
          userId: "usr_1",
          email: "user@hotel.com",
          name: "User",
          role: "RECEPTION",
          propertyId: "prop_01",
          permissions: [],
          token: "tok_123",
          expiresAt: "2026-10-01T20:00:00Z",
        },
      }),
    } as Response);

    const { result } = renderHook(() => useSession());
    await act(async () => {});

    expect(result.current.isAuthenticated).toBe(true);

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(getAuthToken()).toBeNull();
  });
});
