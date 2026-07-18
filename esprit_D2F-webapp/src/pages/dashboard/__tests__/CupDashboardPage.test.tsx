import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CupDashboardPage from '../CupDashboardPage';
import * as cupMod from '@/hooks/dashboard/useCupDashboard';

const cup = () => cupMod.useCupDashboard;

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/hooks/dashboard/useCupDashboard', () => ({
  useCupDashboard: vi.fn(() => ({
    kpis: { enCours: 4, tauxReussiteGlobal: 70, couverture: 80, pendingBesoins: 2, critiques: 1 },
    topCompetences: [],
    besoinsPriorises: [],
    loading: false,
    formationsByType: { interne: 1, externe: 2, enLigne: 3 },
    formationsByTypeLoading: false,
    timeline: { periodes: [], totalFormations: 0 },
    timelineLoading: false,
  })),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { username: 'CUP User', email: 'cup@esprit.tn', role: 'CUP' } })),
}));

function renderWith(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CupDashboardPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CupDashboardPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders title and KPIs', () => {
    renderWith(queryClient);
    expect(screen.getByText('Tableau de bord CUP')).toBeInTheDocument();
    expect(screen.getByText('Formations actives')).toBeInTheDocument();
    expect(screen.getByText('Répartition par type')).toBeInTheDocument();
  });

  it('renders besoins and top competences data', () => {
    vi.mocked(cupMod.useCupDashboard).mockReturnValue({
      kpis: { enCours: 12, tauxReussiteGlobal: 65, couverture: 55, pendingBesoins: 3, critiques: 2 },
      topCompetences: [{ name: 'Python', count: 9 }, { name: 'Java', count: 7 }],
      besoinsPriorises: [
        { id: 'b1', label: 'Besoin A', urgency: 4, impact: 5, count: 1, priorite: 'HAUTE', departement: 'INFO' },
        { id: 'b2', label: 'Besoin B', urgency: 5, impact: 4, count: 1, priorite: 'CRITIQUE', departement: 'MATH' },
      ],
      loading: false,
      formationsByType: { interne: 1, externe: 2, enLigne: 3 },
      formationsByTypeLoading: false,
      timeline: { periodes: [{ label: '2026-01', nombreFormations: 5 }, { label: '2026-02', nombreFormations: 8 }], totalFormations: 13 },
      timelineLoading: false,
    });
    renderWith(queryClient);
    expect(screen.getByText('Besoins à traiter')).toBeInTheDocument();
    expect(screen.getByText('Besoin A')).toBeInTheDocument();
    expect(screen.getByText('Besoin B')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Top 5 compétences à renforcer')).toBeInTheDocument();
  });

  it('shows loading state on cards', () => {
    vi.mocked(cupMod.useCupDashboard).mockReturnValue({
      kpis: { enCours: 0, tauxReussiteGlobal: 0, couverture: 0, pendingBesoins: 0, critiques: 0 },
      topCompetences: [],
      besoinsPriorises: [],
      loading: true,
      formationsByType: undefined,
      formationsByTypeLoading: true,
      timeline: undefined,
      timelineLoading: true,
    });
    renderWith(queryClient);
    expect(screen.getByText('Tableau de bord CUP')).toBeInTheDocument();
    expect(document.querySelectorAll('.ant-spin').length).toBeGreaterThan(0);
  });

  it('filters besoins via search input', async () => {
    vi.mocked(cupMod.useCupDashboard).mockReturnValue({
      kpis: { enCours: 12, tauxReussiteGlobal: 65, couverture: 55, pendingBesoins: 3, critiques: 2 },
      topCompetences: [],
      besoinsPriorises: [
        { id: 'b1', label: 'Python avancé', urgency: 4, impact: 5, count: 1, priorite: 'HAUTE', departement: 'INFO' },
        { id: 'b2', label: 'Sécurité réseau', urgency: 5, impact: 4, count: 1, priorite: 'CRITIQUE', departement: 'MATH' },
      ],
      loading: false,
      formationsByType: { interne: 1, externe: 2, enLigne: 3 },
      formationsByTypeLoading: false,
      timeline: { periodes: [], totalFormations: 0 },
      timelineLoading: false,
    });
    renderWith(queryClient);
    const input = screen.getByPlaceholderText('Rechercher') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Python' } });
    await waitFor(() => expect(screen.getByText('Python avancé')).toBeInTheDocument());
    expect(screen.queryByText('Sécurité réseau')).not.toBeInTheDocument();
  });

  it('navigates to competences from coverage card', () => {
    renderWith(queryClient);
    const links = screen.getAllByText('Voir le référentiel');
    const coverageLink = links.find((l) => !((l.closest('button') as HTMLElement)?.className.includes('cup-kpi-link')));
    fireEvent.click(coverageLink!.closest('button') as HTMLElement);
    expect(navigate).toHaveBeenCalledWith('/home/competences');
  });

  it('navigates to Formation from create CTA', () => {
    renderWith(queryClient);
    fireEvent.click(screen.getByText('Créer une formation'));
    expect(navigate).toHaveBeenCalledWith('/home/Formation');
  });

  it('changes timeline period via segmented control', async () => {
    vi.mocked(cupMod.useCupDashboard).mockReturnValue({
      kpis: { enCours: 12, tauxReussiteGlobal: 65, couverture: 55, pendingBesoins: 3, critiques: 2 },
      topCompetences: [],
      besoinsPriorises: [],
      loading: false,
      formationsByType: { interne: 1, externe: 2, enLigne: 3 },
      formationsByTypeLoading: false,
      timeline: { periodes: [
        { label: '2025-08', nombreFormations: 1 }, { label: '2025-09', nombreFormations: 2 },
        { label: '2025-10', nombreFormations: 3 }, { label: '2025-11', nombreFormations: 4 },
        { label: '2025-12', nombreFormations: 5 }, { label: '2026-01', nombreFormations: 6 },
        { label: '2026-02', nombreFormations: 7 }, { label: '2026-03', nombreFormations: 8 },
        { label: '2026-04', nombreFormations: 9 }, { label: '2026-05', nombreFormations: 10 },
        { label: '2026-06', nombreFormations: 11 }, { label: '2026-07', nombreFormations: 12 },
      ], totalFormations: 78 },
      timelineLoading: false,
    });
    renderWith(queryClient);
    expect(screen.getByText(/12 derniers mois/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('Trimestre'));
    await waitFor(() => expect(screen.getByText(/ce trimestre/)).toBeInTheDocument());
  });
});

