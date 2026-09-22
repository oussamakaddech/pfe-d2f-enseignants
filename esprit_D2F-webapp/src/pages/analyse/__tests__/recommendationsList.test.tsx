import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecommendationsList from '@/components/analytics/RecommendationsList';
import type { Recommendation } from '@/models/analyse/analyticsFeature';

const reco: Recommendation = {
  id: 1,
  formation_id: 5,
  formation_titre: 'Formation Python',
  formation_type: 'INTERNE',
  competence_id: 10,
  competence_nom: 'Python',
  score_global: 0.85,
  score_pertinence: 0.8,
  score_reussite: 0.9,
  score_disponibilite: 0.7,
  probabilite_reussite: 0.8,
  rang_dans_parcours: 1,
  est_prerequis: false,
  prerequis_satisfaits: true,
  niveau_apres: 4,
  niveau_actuel: 2,
  justification: 'Recommandé',
  statut: 'PROPOSEE',
};

describe('RecommendationsList', () => {
  it('affiche un message vide sans recommandations', () => {
    render(<RecommendationsList recommendations={[]} />);
    expect(screen.getByText(/Aucune recommandation/i)).toBeInTheDocument();
  });

  it('affiche le titre et la pertinence (score de pertinence, pas réussite)', () => {
    render(<RecommendationsList recommendations={[reco]} />);
    expect(screen.getByText('Formation Python')).toBeInTheDocument();
    expect(screen.getByText('Pertinence : 80/100')).toBeInTheDocument();
    expect(screen.queryByText(/réussite/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/score 0\.85/)).not.toBeInTheDocument();
  });

  it('affiche les boutons accepter/ignorer pour une reco PROPOSEE', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(
      <RecommendationsList recommendations={[reco]} onAccept={onAccept} onReject={onReject} />,
    );
    screen.getByText('Accepter').click();
    screen.getByText('Ignorer').click();
    expect(onAccept).toHaveBeenCalledWith(1);
    expect(onReject).toHaveBeenCalledWith(1);
  });

  it('affiche Prérequis à vérifier quand les prérequis ne sont pas satisfaits', () => {
    render(<RecommendationsList recommendations={[{ ...reco, prerequis_satisfaits: false }]} />);
    expect(screen.getByText('Prérequis à vérifier')).toBeInTheDocument();
    expect(screen.queryByText('prérequis manquants')).not.toBeInTheDocument();
  });

  it('affiche Prérequis satisfaits quand les prérequis sont satisfaits', () => {
    render(<RecommendationsList recommendations={[reco]} />);
    expect(screen.getByText('Prérequis satisfaits')).toBeInTheDocument();
  });

  it('sans nom de competence : n affiche ni tiret ni separateur, seulement le rang', () => {
    // L API ne renvoie un nom de competence que si un savoir a ete apparie.
    // Afficher « — · rang 2 » remplissait la ligne sans rien apprendre.
    render(<RecommendationsList recommendations={[{ ...reco, competence_nom: null }]} />);
    expect(screen.getByText(/rang 1/)).toBeInTheDocument();
    expect(screen.queryByText(/—/)).toBeNull();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it('avec un nom de competence : le libelle et le rang sont separes par un point median', () => {
    render(<RecommendationsList recommendations={[reco]} />);
    expect(screen.getByText(/Python · rang 1/)).toBeInTheDocument();
  });
});
