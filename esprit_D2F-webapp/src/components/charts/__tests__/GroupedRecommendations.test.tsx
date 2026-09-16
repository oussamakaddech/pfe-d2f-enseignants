import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GroupedRecommendations from '../GroupedRecommendations';
import type { GroupedRecommendationsResponse, Recommendation } from '@/models/analyse';

vi.mock('@/hooks/analyse/useAnalytics', () => ({
  useGroupedRecommendations: vi.fn(),
}));

vi.mock('./RecommendationCard', () => ({
  default: ({ recommendation }: { recommendation: Recommendation }) => (
    <div>card:{recommendation.formation_titre}</div>
  ),
}));

import { useGroupedRecommendations } from '@/hooks/analyse/useAnalytics';

const reco: Recommendation = {
  id: 1, formation_id: 10, formation_titre: 'Formation Python', formation_type: 'INTERNE',
  competence_id: 1, score_global: 0.8, score_pertinence: 0.8, score_reussite: 0.7,
  score_disponibilite: 0.9, probabilite_reussite: 0.85, rang_dans_parcours: 1,
  justification: 'utile', statut: 'PROPOSEE',
};

const data: GroupedRecommendationsResponse = {
  enseignant_id: 'ENS001', group_by: 'competence', total: 1,
  groups: [
    { group_key: 'Python', group_label: 'Python', nb: 1, score_moyen: 0.8, score_max: 0.9, nb_acceptees: 0, items: [reco] },
  ],
};

describe('GroupedRecommendations', () => {
  it('renders the title', () => {
    vi.mocked(useGroupedRecommendations).mockReturnValue({ data, isLoading: false, isError: false } as never);
    render(<GroupedRecommendations enseignantId="ENS001" />);
    expect(screen.getByText(/Regroupement des recommandations/i)).toBeInTheDocument();
  });

  it('renders recommendations grouped by label', () => {
    vi.mocked(useGroupedRecommendations).mockReturnValue({ data, isLoading: false, isError: false } as never);
    render(<GroupedRecommendations enseignantId="ENS001" />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText(/score max 90%/i)).toBeInTheDocument();
  });

  it('shows empty prompt when no enseignant id', () => {
    vi.mocked(useGroupedRecommendations).mockReturnValue({ data: undefined, isLoading: false, isError: false } as never);
    render(<GroupedRecommendations enseignantId="" />);
    expect(screen.getByText(/Entrez un identifiant enseignant/i)).toBeInTheDocument();
  });

  it('shows error alert on failure', () => {
    vi.mocked(useGroupedRecommendations).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never);
    render(<GroupedRecommendations enseignantId="ENS001" />);
    expect(screen.getByText(/Impossible de charger le regroupement/i)).toBeInTheDocument();
  });

  it('switches grouping when a segmented option is selected', () => {
    const byType: GroupedRecommendationsResponse = {
      ...data, group_by: 'type',
      groups: [{ group_key: 'INTERNE', group_label: 'INTERNE', nb: 1, score_moyen: 0.8, score_max: 0.9, nb_acceptees: 0, items: [reco] }],
    };
    vi.mocked(useGroupedRecommendations).mockImplementation((_id, groupBy) =>
      ({ data: groupBy === 'type' ? byType : data, isLoading: false, isError: false } as never));
    render(<GroupedRecommendations enseignantId="ENS001" />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    const segmented = screen.getByRole('radio', { name: /Par type/i });
    fireEvent.click(segmented);
    expect(screen.getByText('INTERNE')).toBeInTheDocument();
  });
});
