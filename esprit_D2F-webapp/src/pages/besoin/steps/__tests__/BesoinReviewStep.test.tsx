import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookOutlined } from '@ant-design/icons';
import BesoinReviewStep, { buildSummarySections } from '../BesoinReviewStep';

describe('BesoinReviewStep', () => {
  it('renders sections and their items with edit buttons', () => {
    const onEdit = vi.fn();
    const sections = [
      {
        key: 'contexte',
        title: 'Contexte',
        icon: <BookOutlined />,
        items: [
          { label: 'Unité Pédagogique', value: 'INFO' },
          { label: 'Type de besoin', value: 'Collectif' },
        ],
      },
      {
        key: 'formation',
        title: 'Formation',
        icon: null,
        items: [{ label: 'Nom', value: 'Python', strong: true }],
      },
    ];
    render(<BesoinReviewStep sections={sections} onEditSection={onEdit} />);
    expect(screen.getByText('Récapitulatif de votre demande')).toBeInTheDocument();
    expect(screen.getByText('Contexte')).toBeInTheDocument();
    expect(screen.getByText('Formation')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getAllByText('Modifier')).toHaveLength(2);
  });

  it('calls onEditSection with the section index', () => {
    const onEdit = vi.fn();
    const sections = [
      { key: 'a', title: 'A', icon: null, items: [{ label: 'X', value: '1' }] },
      { key: 'b', title: 'B', icon: null, items: [{ label: 'Y', value: '2' }] },
    ];
    render(<BesoinReviewStep sections={sections} onEditSection={onEdit} />);
    const buttons = screen.getAllByText('Modifier');
    fireEvent.click(buttons[1]);
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  it('renders a pill when item has pillColor', () => {
    const sections = [
      {
        key: 'formation',
        title: 'Formation',
        icon: null,
        items: [{ label: 'Priorité', value: 'Haute', pillColor: '#ef4444' }],
      },
    ];
    render(<BesoinReviewStep sections={sections} onEditSection={vi.fn()} />);
    expect(screen.getByText('Haute')).toBeInTheDocument();
    expect(document.querySelector('.bf-summary-pill')).toBeInTheDocument();
  });

  it('renders empty sections without crashing', () => {
    render(<BesoinReviewStep sections={[]} onEditSection={vi.fn()} />);
    expect(screen.getByText('Récapitulatif de votre demande')).toBeInTheDocument();
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
  });

  it('buildSummarySections builds all sections with computed values', () => {
    const values = {
      up: '1',
      departement: '2',
      typeBesoin: 'INDIVIDUEL',
      publicCible: 'Jean Dupont',
      titre: 'Python pour tous',
      theme: 'Data',
      objectifFormation: 'Apprendre',
      objectifsPedagogiques: 'Pédago',
      priorite: 'HAUTE',
      impactStrategique: 'Stratégique',
      propositionAnimateur: 'Prof A',
      animateurs: 'A1\nA2',
      enseignants: 'E1, E2',
      periodCode: 'WINTER',
      dateDebut: { format: (f: string) => `D1-${f}` },
      dateFin: { format: (f: string) => `D2-${f}` },
      dureeFormation: 12,
      nbMaxParticipants: 30,
      estOuverte: true,
      methodesEvaluationAcquis: 'QCM',
      autresInformations: 'RAS',
    };
    const sections = buildSummarySections(
      values as unknown as Record<string, unknown>,
      [{ id: '1', name: 'UP INFO' }],
      [{ id: '2', name: 'Dept Math' }],
      [{ competenceId: 1, competenceNom: 'Java', savoirNom: 'POO' }],
      true,
      (v: unknown) => String(v ?? '—'),
    );
    expect(sections).toHaveLength(5);
    const titles = sections.map((s) => s.title);
    expect(titles).toEqual([
      'Contexte',
      'Formation',
      'Détails & planning',
      'Compétences RICE',
      'Paramètres',
    ]);
    render(<BesoinReviewStep sections={sections} onEditSection={vi.fn()} />);
    expect(screen.getByText('UP INFO')).toBeInTheDocument();
    expect(screen.getByText('Dept Math')).toBeInTheDocument();
    expect(screen.getByText('Java → POO')).toBeInTheDocument();
  });

  it('buildSummarySections handles OTHER period and missing values', () => {
    const values = {
      periodCode: 'OTHER',
      customPeriodLabel: 'Semestre spécial',
      typeBesoin: 'COLLECTIF',
      estOuverte: false,
    };
    const sections = buildSummarySections(
      values as unknown as Record<string, unknown>,
      [],
      [],
      [],
      false,
      (v: unknown) => String(v ?? '—'),
    );
    const details = sections.find((s) => s.key === 'details')!;
    expect(details.items.some((i) => i.value === 'Semestre spécial')).toBe(true);
    const params = sections.find((s) => s.key === 'parametres')!;
    expect(params.items.some((i) => i.value === 'Fermée (UP uniquement)')).toBe(true);
  });

  it('buildSummarySections renders dash when no competencies linked', () => {
    const values = { periodCode: 'SUMMER', typeBesoin: 'COLLECTIF' };
    const sections = buildSummarySections(
      values as unknown as Record<string, unknown>,
      [],
      [],
      [],
      false,
      (v: unknown) => String(v ?? '—'),
    );
    const comp = sections.find((s) => s.key === 'competences')!;
    expect(comp.items[0].value).toBe('—');
  });
});
