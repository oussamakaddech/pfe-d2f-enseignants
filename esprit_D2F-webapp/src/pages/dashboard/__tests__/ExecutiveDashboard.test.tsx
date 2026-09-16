import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExecutiveDashboard from '../ExecutiveDashboard';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAnalyticsExport } from '@/hooks/analyse/useReporting';

const navigate = vi.fn();

const dashboardMocks = vi.hoisted(() => {
  const names = [
    'DashboardKpiGrid', 'DashboardHealthCard', 'DashboardAlerts', 'DashboardTimelineChart',
    'DashboardStatusChart', 'DashboardParticipationChart', 'DashboardUpcomingFormations',
    'DashboardPendingNeeds', 'DashboardTopCompetencies', 'DashboardPredictiveInsights',
    'DashboardRecentActivity', 'DashboardFormationTypes', 'DashboardTrainerTypes',
    'DashboardTopPresences', 'DashboardTopAbsences', 'DashboardNonAffected',
  ];
  const m: Record<string, { default: () => JSX.Element }> = {};
  names.forEach((n) => { m[n] = { default: () => <div>{n}</div> }; });
  return m;
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { username: 'Admin', role: 'ADMIN' } })),
}));

vi.mock('@/hooks/analyse/useReporting', () => ({
  useAnalyticsExport: vi.fn(() => ({ exporting: false, exportExcel: vi.fn() })),
}));

vi.mock('@/components/dashboard/DashboardKpiGrid', () => dashboardMocks.DashboardKpiGrid);
vi.mock('@/components/dashboard/DashboardHealthCard', () => dashboardMocks.DashboardHealthCard);
vi.mock('@/components/dashboard/DashboardAlerts', () => dashboardMocks.DashboardAlerts);
vi.mock('@/components/dashboard/DashboardTimelineChart', () => dashboardMocks.DashboardTimelineChart);
vi.mock('@/components/dashboard/DashboardStatusChart', () => dashboardMocks.DashboardStatusChart);
vi.mock('@/components/dashboard/DashboardParticipationChart', () => dashboardMocks.DashboardParticipationChart);
vi.mock('@/components/dashboard/DashboardUpcomingFormations', () => dashboardMocks.DashboardUpcomingFormations);
vi.mock('@/components/dashboard/DashboardPendingNeeds', () => dashboardMocks.DashboardPendingNeeds);
vi.mock('@/components/dashboard/DashboardTopCompetencies', () => dashboardMocks.DashboardTopCompetencies);
vi.mock('@/components/dashboard/DashboardPredictiveInsights', () => dashboardMocks.DashboardPredictiveInsights);
vi.mock('@/components/dashboard/DashboardRecentActivity', () => dashboardMocks.DashboardRecentActivity);
vi.mock('@/components/dashboard/DashboardFormationTypes', () => dashboardMocks.DashboardFormationTypes);
vi.mock('@/components/dashboard/DashboardTrainerTypes', () => dashboardMocks.DashboardTrainerTypes);
vi.mock('@/components/dashboard/DashboardTopPresences', () => dashboardMocks.DashboardTopPresences);
vi.mock('@/components/dashboard/DashboardTopAbsences', () => dashboardMocks.DashboardTopAbsences);
vi.mock('@/components/dashboard/DashboardNonAffected', () => dashboardMocks.DashboardNonAffected);

function renderWith(queryClient: QueryClient, role = 'ADMIN') {
  vi.mocked(useAuth).mockReturnValue({ user: { username: 'User', role } } as never);
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ExecutiveDashboard role={role} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('ExecutiveDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders hero and sections', () => {
    renderWith(queryClient);
    expect(screen.getByText("Vue d'ensemble opérationnelle")).toBeInTheDocument();
    expect(screen.getByText('Santé & alertes')).toBeInTheDocument();
    expect(screen.getByText('DashboardKpiGrid')).toBeInTheDocument();
  });

  it('renders only role-allowed quick links', () => {
    renderWith(queryClient, 'ENSEIGNANT');
    expect(screen.getByText('Besoins')).toBeInTheDocument();
    expect(screen.queryByText('Formations')).not.toBeInTheDocument();
    expect(screen.queryByText('Certificats')).not.toBeInTheDocument();
  });

  it('exports report for admin (PAR_DEPT)', () => {
    const exportExcel = vi.fn();
    vi.mocked(useAnalyticsExport).mockReturnValue({ exporting: false, exportExcel } as never);
    renderWith(queryClient, 'ADMIN');
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.querySelector('.anticon-download')) as HTMLElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(exportExcel).toHaveBeenCalledWith('PAR_DEPT');
  });

  it('exports report for non-admin (PAR_UP)', () => {
    const exportExcel = vi.fn();
    vi.mocked(useAnalyticsExport).mockReturnValue({ exporting: false, exportExcel } as never);
    renderWith(queryClient, 'ENSEIGNANT');
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.querySelector('.anticon-download')) as HTMLElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(exportExcel).toHaveBeenCalledWith('PAR_UP');
  });

  it('refreshes data via the refresh button', async () => {
    renderWith(queryClient, 'ADMIN');
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.querySelector('.anticon-reload')) as HTMLElement;
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText('DashboardKpiGrid')).toBeInTheDocument());
    expect(screen.queryByText('Une erreur est survenue')).not.toBeInTheDocument();
  });

  it('navigates to formations via quick link', () => {
    renderWith(queryClient);
    fireEvent.click(screen.getByText('Formations'));
    expect(navigate).toHaveBeenCalledWith('/home/Formation');
  });
});
