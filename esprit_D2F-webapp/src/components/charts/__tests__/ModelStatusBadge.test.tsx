import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const renderWithClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const httpMocks = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../../../services/httpClient', () => ({
  defaultApi: {
    get: httpMocks.mockGet,
    post: httpMocks.mockPost,
  },
}));

import ModelStatusBadge from '../ModelStatusBadge';

describe('ModelStatusBadge', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows "Modèle à jour" when no drift detected', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { drift_detected: false, days_since_training: 5 },
    });
    renderWithClient(<ModelStatusBadge />);
    await waitFor(() => expect(screen.getByText(/à jour/i)).toBeInTheDocument());
  });

  it('shows "Mode heuristique" when no model is loaded', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { drift_detected: false, message: 'No model loaded' },
    });
    renderWithClient(<ModelStatusBadge />);
    await waitFor(() => expect(screen.getByText(/heuristique/i)).toBeInTheDocument());
  });

  it('shows "Dérive détectée" when drift_detected=true and model is recent', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { drift_detected: true, days_since_training: 10, recommendation: 'Retrain' },
    });
    renderWithClient(<ModelStatusBadge />);
    await waitFor(() => expect(screen.getByText(/Dérive/i)).toBeInTheDocument());
  });

  it('shows "Modèle ancien" when drift_detected=true and >90 days', async () => {
    httpMocks.mockGet.mockResolvedValueOnce({
      data: { drift_detected: true, days_since_training: 120 },
    });
    renderWithClient(<ModelStatusBadge />);
    await waitFor(() => expect(screen.getByText(/ancien/i)).toBeInTheDocument());
  });

  it('shows error state when the endpoint fails', async () => {
    httpMocks.mockGet.mockRejectedValueOnce(new Error('boom'));
    renderWithClient(<ModelStatusBadge />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });
});
