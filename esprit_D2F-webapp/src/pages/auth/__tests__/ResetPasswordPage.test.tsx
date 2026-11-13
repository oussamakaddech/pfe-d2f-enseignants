import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';

// ── Mock du hook useResetPassword ──
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/auth/useAuthService', () => ({
  useResetPassword: () => ({ mutateAsync: mockMutateAsync }),
}));

// ── Mock du hook de notification ──
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({ message: { success: mockSuccess, error: mockError } }),
}));

import ResetPasswordPage from '../ResetPasswordPage';

function renderComponent(token: string | null) {
  const entry = token ? `/reset-password?token=${token}` : '/reset-password';
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App>
        <ResetPasswordPage />
      </App>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche une erreur quand le lien ne contient aucun token', () => {
    renderComponent(null);
    expect(screen.getByText('Lien invalide')).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('appelle resetPassword avec le token du lien', async () => {
    mockMutateAsync.mockResolvedValueOnce('ok');
    renderComponent('tok-123');
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer le mot de passe/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        confirmationKey: 'tok-123',
        newPassword: 'Password1!',
      });
    });
    expect(mockSuccess).toHaveBeenCalledWith('Mot de passe réinitialisé, connectez-vous');
  });

  it('affiche une erreur si le lien est expiré', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      response: { data: { message: 'Confirmation token has expired' } },
    });
    renderComponent('tok-expired');
    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.change(screen.getByLabelText(/confirmer le mot de passe/i), {
      target: { value: 'Password1!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser/i }));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('Confirmation token has expired');
    });
  });
});
