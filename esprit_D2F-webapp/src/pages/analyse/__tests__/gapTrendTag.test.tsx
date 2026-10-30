import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GapTrendTag from '@/components/analytics/GapTrendTag';
import type { SkillGap } from '@/models/analyse/analyticsFeature';

/**
 * Tendance d'un gap — correctif d'audit.
 *
 * Les tableaux de la page enseignant affichaient un booléen `en_regression`
 * qui ne testait que `DECLINING`. Un gap que le MODÈLE annonce en aggravation
 * (`WORSENING`) apparaissait donc « Stable » : l'information la plus utile de
 * la prédiction était perdue au mapping et l'écran rassurait à tort.
 *
 * Ces tests couvrent le composant utilisé par le panneau « Analyse
 * contextuelle » (tableau « Gaps sur le périmètre »), seul tableau de gaps
 * restant après le retrait de l'onglet « Gaps de compétences ».
 */
const base: SkillGap = {
  id: 1,
  competence_id: 10,
  competence_code: 'GC-TECH-U',
  competence_nom: 'Compétences urbanisme',
  domaine_nom: 'GC',
  observed_result: 2,
  knowledge_difficulty_level: 3,
  gap_score: 0.7389,
  priorite_score: 0.7389,
  niveau_urgence: 'HAUTE',
  mois_stagnation: 0,
  trend: null,
  en_regression: false,
  nb_besoins_exprimes: 0,
  justification: null,
  computed_at: '2026-09-22',
};

describe('GapTrendTag', () => {
  it('affiche une aggravation prédite par le modèle, jamais « Stable »', () => {
    render(<GapTrendTag gap={{ ...base, trend: 'WORSENING' }} />);
    expect(screen.getByText('En aggravation')).toBeInTheDocument();
    expect(screen.queryByText('Stable')).toBeNull();
  });

  it('distingue la régression observée de l aggravation prédite', () => {
    render(<GapTrendTag gap={{ ...base, trend: 'DECLINING', en_regression: true }} />);
    expect(screen.getByText('Régression')).toBeInTheDocument();
    expect(screen.queryByText('En aggravation')).toBeNull();
  });

  it('rend DECLARED_ML comme une prédiction du modèle', () => {
    render(<GapTrendTag gap={{ ...base, trend: 'DECLARED_ML' }} />);
    expect(screen.getByText('Prédit par le modèle')).toBeInTheDocument();
  });

  it('rend une amélioration', () => {
    render(<GapTrendTag gap={{ ...base, trend: 'IMPROVING' }} />);
    expect(screen.getByText('En amélioration')).toBeInTheDocument();
  });

  it("n'affiche « Stable » que si le backend le dit", () => {
    render(<GapTrendTag gap={{ ...base, trend: 'STABLE' }} />);
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });

  it('ne conclut pas « Stable » quand aucune tendance n est fournie', () => {
    render(<GapTrendTag gap={base} />);
    expect(screen.getByText('Non renseignée')).toBeInTheDocument();
    expect(screen.queryByText('Stable')).toBeNull();
  });

  it('affiche une valeur inconnue telle quelle plutôt que de l interpréter', () => {
    render(<GapTrendTag gap={{ ...base, trend: 'VALEUR_FUTURE' }} />);
    expect(screen.getByText('VALEUR_FUTURE')).toBeInTheDocument();
  });
});
