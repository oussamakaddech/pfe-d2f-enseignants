import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardGlass from '../DashboardGlass';

vi.mock('@/hooks/analyse/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { role: 'ADMIN', nom: 'Test', prenom: 'User', email: 'test@esprit.tn' },
  })),
}));

vi.mock('@/hooks/dashboard/useDashboardData', () => ({
  useGlobalDashboard: vi.fn(() => ({
    data: null, isLoading: false, isError: false, refetch: vi.fn(),
    dataUpdatedAt: Date.now(),
  })),
}));

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useOverview: vi.fn(() => ({
    data: null, isLoading: false,
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import { useDashboard } from '@/hooks/analyse/useDashboard';

describe('DashboardGlass at-risk KPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows full count from enseignants_a_risque, not capped at 6', () => {
    const manyAtRisk = Array.from({ length: 10 }, (_, i) => ({
      enseignant_id: `E${String(i).padStart(3, '0')}`,
      teacher_name: `Teacher ${i}`,
      score_risque: 0.8,
      department: 'GC',
    }));

    (useDashboard as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      dashboard: {
        enseignants_a_risque: manyAtRisk,
        competences_en_declin: [],
        competences_en_demande: [],
        alertes_recentes: [],
        top_formations_recommandees: [],
        training_effectiveness: [],
      },
      error: null,
      lastUpdate: '10:00',
      refetch: vi.fn(),
    });

    const { container } = render(<DashboardGlass />);
    // The first glass-kpi-value should contain 10, not 6
    const kpiValues = container.querySelectorAll('.glass-kpi-value');
    expect(kpiValues[0].textContent).toBe('10');
  });

  it('shows 0 when no at-risk teachers', () => {
    (useDashboard as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      dashboard: {
        enseignants_a_risque: [],
        competences_en_declin: [],
        competences_en_demande: [],
        alertes_recentes: [],
        top_formations_recommandees: [],
        training_effectiveness: [],
      },
      error: null,
      lastUpdate: '10:00',
      refetch: vi.fn(),
    });

    const { container } = render(<DashboardGlass />);
    const kpiValues = container.querySelectorAll('.glass-kpi-value');
    // First KPI should be 0 (at-risk count)
    expect(kpiValues[0].textContent).toBe('0');
  });
});
