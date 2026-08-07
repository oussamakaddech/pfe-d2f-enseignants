import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from 'antd';
import NewFeaturesSection from '@/redesign/components/NewFeaturesSection';

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useTrainingImpact: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useTrainingImpactFormations: vi.fn(() => ({ data: null, isLoading: false, isError: false })),
  useSupplyDemand: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
}));

vi.mock('@/hooks/analyse/useNewFeatures', () => ({
  useDetectAnomaliesDepartment: vi.fn(() => ({
    mutateAsync: vi.fn(async () => ({ nb_anomalies: 3, nb_enseignants_scannes: 20 })),
    isPending: false,
  })),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn() },
  };
});

const impactData = {
  gain_niveau_moyen: 1.2,
  reduction_risque_moyenne: 0.3,
  nb_risque_reduit: 10,
  nb_risque_augmente: 2,
  nb_formations_suivies: 40,
};
const formations = {
  formations: [
    {
      formation_id: 1,
      formation_titre: 'Python',
      nb_enseignants: 15,
      niveau_moyen_avant: 1,
      niveau_moyen_apres: 3,
      gain_niveau_moyen: 2,
    },
  ],
};
const supply = [
  {
    competence_id: 1,
    competence_nom: 'Python',
    domaine_nom: 'Info',
    demand_score: 80,
    nb_enseignants: 20,
    quadrant: 'CRITIQUE',
  },
  {
    competence_id: 2,
    competence_nom: 'SQL',
    domaine_nom: 'Info',
    demand_score: 40,
    nb_enseignants: 10,
    quadrant: 'SAINE',
  },
];

import {
  useTrainingImpact,
  useTrainingImpactFormations,
  useSupplyDemand,
} from '@/hooks/analyse/useAnalysePredictive';
import { useDetectAnomaliesDepartment } from '@/hooks/analyse/useNewFeatures';

beforeEach(() => {
  vi.clearAllMocks();
  (useTrainingImpact as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: impactData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  (useTrainingImpactFormations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: formations,
    isLoading: false,
    isError: false,
  });
  (useSupplyDemand as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data: supply,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

function renderSection(props: { departementId?: string | null } = {}) {
  return render(
    <MemoryRouter>
      <App>
        <NewFeaturesSection departementId={props.departementId} />
      </App>
    </MemoryRouter>,
  );
}

describe('NewFeaturesSection', () => {
  it("affiche les sections d'impact, offre/demande et scan", () => {
    renderSection();
    expect(screen.getByText('Impact réel des formations')).toBeInTheDocument();
    expect(screen.getByText('Matrice Offre vs Demande')).toBeInTheDocument();
    expect(screen.getByText("Scan d'anomalies en direct")).toBeInTheDocument();
  });
  it("affiche les KPIs d'impact réel", () => {
    renderSection();
    expect(screen.getByText('Gain de niveau moyen')).toBeInTheDocument();
    expect(screen.getByText('Réduction du risque')).toBeInTheDocument();
    expect(screen.getByText('Formations suivies')).toBeInTheDocument();
  });
  it("affiche la répartition par quadrant de l'offre/demande", () => {
    renderSection();
    expect(screen.getByText('Répartition par quadrant')).toBeInTheDocument();
    expect(screen.getAllByText('CRITIQUE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
  });
  it("lance le scan d'anomalies et affiche le message", async () => {
    const scan = useDetectAnomaliesDepartment() as unknown as {
      mutateAsync: ReturnType<typeof vi.fn>;
    };
    (useDetectAnomaliesDepartment as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: scan.mutateAsync,
      isPending: false,
    });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: /Lancer le scan/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Scan terminé : 3 anomalie\(s\) détectée\(s\) sur 20 enseignant\(s\)/),
      ).toBeInTheDocument(),
    );
  });
});
