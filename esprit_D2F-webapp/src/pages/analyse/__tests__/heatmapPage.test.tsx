import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useHeatmap: vi.fn(),
}));

vi.mock('../hooks/useAnalyticsQueries', () => ({
  useHeatmap: mocks.useHeatmap,
}));

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HeatmapPage from '@/pages/analyse/HeatmapPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('HeatmapPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le titre de la page', () => {
    mocks.useHeatmap.mockReturnValue({ data: [], isLoading: false });
    render(<HeatmapPage />, { wrapper });
    expect(screen.getByText(/Heatmap des gaps/i)).toBeInTheDocument();
  });
});
