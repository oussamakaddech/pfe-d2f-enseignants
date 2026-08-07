import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useModelStatus: vi.fn(),
  useModelDrift: vi.fn(),
  useModelRetrain: vi.fn(),
  useModelRollback: vi.fn(),
}));

vi.mock('../hooks/useAnalyticsQueries', () => ({
  useModelStatus: mocks.useModelStatus,
  useModelDrift: mocks.useModelDrift,
  useModelRetrain: mocks.useModelRetrain,
  useModelRollback: mocks.useModelRollback,
}));

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModelMonitoringPage from '@/pages/analyse/ModelMonitoringPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = () => {
  mocks.useModelStatus.mockReturnValue({ data: undefined, isLoading: false });
  mocks.useModelDrift.mockReturnValue({ data: undefined, isLoading: false });
  mocks.useModelRetrain.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.useModelRollback.mockReturnValue({ mutate: vi.fn(), isPending: false });
};

describe('ModelMonitoringPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le titre du monitoring', () => {
    setup();
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText(/Monitoring du modèle/i)).toBeInTheDocument();
  });

  it('affiche les boutons réentraîner et rollback', () => {
    setup();
    render(<ModelMonitoringPage />, { wrapper });
    expect(screen.getByText(/Réentraîner/i)).toBeInTheDocument();
    expect(screen.getByText(/Rollback/i)).toBeInTheDocument();
  });
});
