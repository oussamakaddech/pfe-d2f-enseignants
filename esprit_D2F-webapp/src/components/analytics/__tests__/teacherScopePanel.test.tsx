import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeacherScopePanel from '@/components/analytics/TeacherScopePanel';
import type { TeacherScopeAnalysis } from '@/models/analyse/analyticsFeature';

const data: TeacherScopeAnalysis = {
  context: {
    teacher_id: 'T1',
    nom_complet: 'Wafa BenYoussef',
    mail: 'w.benyoussef@esprit.tn',
    specialite: null,
    grade: null,
    up_id: null,
    up_libelle: 'Réseaux & Télécoms',
    dept_id: null,
    dept_libelle: 'Département Réseaux',
  },
  gaps: [
    {
      id: 1,
      competence_id: 10,
      competence_code: 'RES.SEC',
      competence_nom: 'Sécurité Applicative',
      domaine_nom: null,
      observed_result: 0,
      knowledge_difficulty_level: 5,
      gap_score: 1,
      priorite_score: 1,
      niveau_urgence: 'CRITIQUE',
      mois_stagnation: 0,
      en_regression: false,
      nb_besoins_exprimes: 0,
      justification: null,
      computed_at: '2026-08-01',
    },
  ],
  recommendations: [
    {
      id: 2,
      formation_id: 5,
      formation_titre: 'Administration Linux & Ansible',
      formation_type: null,
      competence_id: 10,
      competence_nom: 'Administration Linux',
      score_global: 0.9,
      score_pertinence: 0.9,
      score_reussite: 0,
      score_disponibilite: 0,
      probabilite_reussite: 0.9,
      rang_dans_parcours: 1,
      est_prerequis: false,
      prerequis_satisfaits: true,
      niveau_apres: null,
      niveau_actuel: null,
      justification: 'Couvre une grande part des savoirs manquants sur la compétence cible',
      statut: 'PROPOSEE',
    },
  ],
  scoped_competencies_count: 3,
  total_competencies_count: 15,
  scope: {
    type: 'DEPARTMENT',
    is_global: false,
    label: 'Département Réseaux & Télécoms',
    fallback: false,
    fallback_reason: null,
  },
  computed_at: '2026-08-01',
};

describe('TeacherScopePanel', () => {
  it('affiche le contexte et les gaps du périmètre', () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.getByText('Wafa BenYoussef')).toBeInTheDocument();
    expect(screen.getByText('Sécurité Applicative')).toBeInTheDocument();
    expect(screen.getByText('CRITIQUE')).toBeInTheDocument();
  });

  it("n'affiche pas le niveau de compétence du référentiel", () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.queryByText('Niveau')).not.toBeInTheDocument();
    expect(screen.queryByText('0.0 / 5')).not.toBeInTheDocument();
  });

  it('affiche la pertinence des formations ciblées', () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.getByText('Pertinence : 90/100')).toBeInTheDocument();
    expect(screen.queryByText(/Score 90/)).not.toBeInTheDocument();
  });

  it('affiche le périmètre sous la forme X compétences analysées sur Y accessibles', () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.getByText(/3 compétences analysées sur 15 accessibles/)).toBeInTheDocument();
    expect(screen.queryByText(/3 \/ 15 compétences/)).not.toBeInTheDocument();
  });

  it("n'affiche jamais « Référentiel global (périmètre vide) » quand le scope est défini", () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.queryByText(/Référentiel global/)).not.toBeInTheDocument();
    expect(screen.queryByText(/périmètre vide/)).not.toBeInTheDocument();
    expect(screen.getByText('Département Réseaux & Télécoms')).toBeInTheDocument();
  });

  it('affiche « Périmètre global » uniquement pour un scope GLOBAL', () => {
    const globalData: TeacherScopeAnalysis = {
      ...data,
      scope: {
        type: 'GLOBAL',
        is_global: true,
        label: 'Périmètre global',
        fallback: false,
        fallback_reason: null,
      },
    };
    render(<TeacherScopePanel data={globalData} loading={false} />);
    expect(screen.getByText('Périmètre global')).toBeInTheDocument();
    expect(screen.queryByText('Département Réseaux & Télécoms')).not.toBeInTheDocument();
  });

  it('affiche un avertissement explicite quand le périmètre est élargi (fallback)', () => {
    const fallbackData: TeacherScopeAnalysis = {
      ...data,
      scope: {
        type: 'DEPARTMENT',
        is_global: false,
        label: 'Département Génie Civil',
        fallback: true,
        fallback_reason: 'Référentiel incomplet pour ce périmètre.',
      },
    };
    render(<TeacherScopePanel data={fallbackData} loading={false} />);
    expect(screen.getByText('Périmètre élargi au référentiel global')).toBeInTheDocument();
    expect(screen.getByText('Référentiel incomplet pour ce périmètre.')).toBeInTheDocument();
  });

  it('affiche une alerte « données manquantes » quand aucun niveau n\'est enregistré sur le périmètre', () => {
    const noLevels: TeacherScopeAnalysis = { ...data, niveaux_sur_scope: 0 };
    render(<TeacherScopePanel data={noLevels} loading={false} />);
    expect(screen.getByText('Aucun niveau enregistré sur ce périmètre')).toBeInTheDocument();
    expect(
      screen.getByText(/Les gaps sont calculés depuis le référentiel seul/),
    ).toBeInTheDocument();
  });

  it("n'affiche pas l'alerte « données manquantes » quand des niveaux existent sur le périmètre", () => {
    const withLevels: TeacherScopeAnalysis = { ...data, niveaux_sur_scope: 4 };
    render(<TeacherScopePanel data={withLevels} loading={false} />);
    expect(screen.queryByText('Aucun niveau enregistré sur ce périmètre')).not.toBeInTheDocument();
  });

  it("n'affiche pas l'alerte quand le champ niveaux_sur_scope est absent (compat arrière)", () => {
    render(<TeacherScopePanel data={data} loading={false} />);
    expect(screen.queryByText('Aucun niveau enregistré sur ce périmètre')).not.toBeInTheDocument();
  });
});
