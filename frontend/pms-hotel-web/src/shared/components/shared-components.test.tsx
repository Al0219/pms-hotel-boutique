import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LoadingSpinner,
  LoadingSkeleton,
  LoadingState,
  ErrorState,
  EmptyState,
} from "./index";

describe("Shared UI State Components", () => {
  describe("LoadingSpinner & LoadingState", () => {
    it("renders spinner with default accessible label", () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Cargando..."
      );
    });

    it("renders custom spinner message and size", () => {
      render(<LoadingSpinner size="lg" label="Procesando pago..." />);
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Procesando pago..."
      );
    });

    it("renders LoadingState container with text", () => {
      render(<LoadingState message="Cargando reservaciones..." />);
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Cargando reservaciones...")).toBeInTheDocument();
    });

    it("renders LoadingSkeleton with given dimensions", () => {
      const { container } = render(
        <LoadingSkeleton width={200} height={40} borderRadius={8} />
      );
      const skeleton = container.firstElementChild as HTMLElement;
      expect(skeleton).toBeInTheDocument();
      expect(skeleton.style.width).toBe("200px");
      expect(skeleton.style.height).toBe("40px");
      expect(skeleton.style.borderRadius).toBe("8px");
    });
  });

  describe("ErrorState", () => {
    it("renders error state with title, message and error code", () => {
      render(
        <ErrorState
          title="Error al cargar datos"
          message="No se pudo conectar con el servidor"
          errorCode="ERR_FETCH_FAILED"
        />
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Error al cargar datos")).toBeInTheDocument();
      expect(
        screen.getByText("No se pudo conectar con el servidor")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Código de error: ERR_FETCH_FAILED")
      ).toBeInTheDocument();
    });

    it("triggers onRetry callback when clicking retry button", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(
        <ErrorState
          title="Error"
          onRetry={onRetry}
          retryLabel="Intentar de nuevo"
        />
      );

      const button = screen.getByRole("button", { name: /Intentar de nuevo/i });
      await user.click(button);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("EmptyState", () => {
    it("renders empty state with title and description", () => {
      render(
        <EmptyState
          title="Sin reservas registradas"
          description="Aún no hay reservas creadas para este hotel."
        />
      );
      expect(screen.getByRole("region")).toHaveAttribute(
        "aria-label",
        "Sin reservas registradas"
      );
      expect(screen.getByText("Sin reservas registradas")).toBeInTheDocument();
      expect(
        screen.getByText("Aún no hay reservas creadas para este hotel.")
      ).toBeInTheDocument();
    });

    it("renders action button and handles action click", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <EmptyState
          title="Sin folios"
          actionLabel="Crear Folio"
          onAction={onAction}
        />
      );

      const button = screen.getByRole("button", { name: "Crear Folio" });
      await user.click(button);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });
});
