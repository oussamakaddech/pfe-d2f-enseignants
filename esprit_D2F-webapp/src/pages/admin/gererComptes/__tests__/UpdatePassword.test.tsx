import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "antd";

// ── Mock du hook useUpdatePassword ──
const mockMutateAsync = vi.fn();
vi.mock("@/hooks/auth/useAuthService", () => ({
  useUpdatePassword: () => ({ mutateAsync: mockMutateAsync }),
}));

// ── Mock du hook d'notification ──
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/hooks/ui/useAppNotification", () => ({
  default: () => ({ message: { success: mockSuccess, error: mockError } }),
}));

// ── Mock du composant AppPageHeader (pas besoin pour ce test) ──
vi.mock("@/components/common", () => ({
  AppPageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
  shadow: { sm: "0 1px 2px rgba(0,0,0,0.1)" },
  radius: { lg: 8 },
}));

import UpdatePassword from "../UpdatePassword";

function renderComponent() {
  return render(
    <BrowserRouter>
      <App>
        <UpdatePassword />
      </App>
    </BrowserRouter>
  );
}

describe("UpdatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rend le formulaire avec les champs attendus", () => {
    renderComponent();
    expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mettre à jour/i })).toBeInTheDocument();
  });

  it("affiche une erreur quand les mots de passe ne correspondent pas", async () => {
    renderComponent();
    const newPwd = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPwd = screen.getByLabelText(/confirmer le mot de passe/i);
    const submitBtn = screen.getByRole("button", { name: /mettre à jour/i });

    fireEvent.change(newPwd, { target: { value: "Password1!" } });
    fireEvent.change(confirmPwd, { target: { value: "Different2!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
    });
    // Le service ne doit PAS être appelé
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("appelle updatePassword avec les bons champs quand les mots de passe correspondent", async () => {
    mockMutateAsync.mockResolvedValueOnce("ok");
    renderComponent();
    const newPwd = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPwd = screen.getByLabelText(/confirmer le mot de passe/i);
    const submitBtn = screen.getByRole("button", { name: /mettre à jour/i });

    fireEvent.change(newPwd, { target: { value: "Password1!" } });
    fireEvent.change(confirmPwd, { target: { value: "Password1!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        newPassword: "Password1!",
        confirmation: "Password1!",
      });
    });
    expect(mockSuccess).toHaveBeenCalledWith("Mot de passe mis à jour avec succès !");
  });

  it("affiche une erreur si le service échoue", async () => {
    mockMutateAsync.mockRejectedValueOnce({
      response: { data: { message: "Erreur serveur" } },
    });
    renderComponent();
    const newPwd = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmPwd = screen.getByLabelText(/confirmer le mot de passe/i);
    const submitBtn = screen.getByRole("button", { name: /mettre à jour/i });

    fireEvent.change(newPwd, { target: { value: "Password1!" } });
    fireEvent.change(confirmPwd, { target: { value: "Password1!" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Erreur serveur");
    });
  });
});
