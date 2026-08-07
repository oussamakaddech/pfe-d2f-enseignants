import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeacherAnalyticsPage from '../TeacherAnalyticsPage';

vi.mock('@/hooks/analyse/useAnalytics', () => ({
  useAnalytics: vi.fn(() => ({
    loading: false,
    analysing: false,
    gaps: null,
    recommendations: null,
    trainingPath: null,
    analyseResult: null,
    error: null,
    runAnalysis: vi.fn(),
    fetchGaps: vi.fn(),
    fetchRecommendations: vi.fn(),
    fetchTrainingPath: vi.fn(),
    updateRecoStatus: vi.fn(),
    updatingReco: false,
  })),
}));

vi.mock('@/hooks/formation/useTeacherSearch', () => ({
  useTeacherSearch: vi.fn(() => ({ data: [], isLoading: false })),
  formatTeacherLabel: vi.fn(() => 'Teacher'),
  getTeacherId: vi.fn(() => 'E1'),
}));

describe('TeacherAnalyticsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders header and tabs', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TeacherAnalyticsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('Analyse Individuelle Enseignant')).toBeInTheDocument();
    expect(screen.getByText('Identifiant enseignant')).toBeInTheDocument();
    expect(screen.getByText('Charger')).toBeInTheDocument();
  });
});
