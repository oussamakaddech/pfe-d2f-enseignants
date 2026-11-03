import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FicheFormation, { resolvePeriodLabel, resolveStructureLabel } from '../FicheFormation';

const navigateMock = vi.fn();
let mockProfile = { role: 'admin', email: 'admin@esprit.tn' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '42' }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/hooks/formation/useFormations', () => ({
  useFormationById: () => ({
    data: {
      idFormation: 42,
      titreFormation: 'Formation TypeScript Avancé',
      typeFormation: 'INTERNE',
      inscriptionsOuvertes: true,
      seances: [],
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/formation/useFormationExtras', () => ({
  useProfile: () => ({ data: mockProfile }),
  useInscriptionsByEnseignant: () => ({ data: [] }),
  useDemanderInscription: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/enseignant/useEnseignants', () => ({
  useEnseignantById: () => ({ data: null }),
}));

vi.mock('@/pages/formation/hooks/useAnimatorPermissions', () => ({
  useAnimatorPermissions: () => ({ canProposeSelf: false, canProposeOther: false, canValidate: false }),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({ message: { success: vi.fn(), error: vi.fn() } }),
}));

vi.mock('../FormationParticipantsPanel', () => ({
  default: () => <div data-testid="participants-panel" />,
}));

vi.mock('@/pages/formation/components/AnimatorProposalsPanel', () => ({
  default: () => <div data-testid="animator-panel" />,
}));

describe('resolvePeriodLabel', () => {
  it('mappe tous les codes backend (dont SPRINT/WORKSHOP)', () => {
    expect(resolvePeriodLabel('P1')).toBe('Période 1');
    expect(resolvePeriodLabel('P2')).toBe('Période 2');
    expect(resolvePeriodLabel('WINTER')).toBe("Session d'Hiver");
    expect(resolvePeriodLabel('SUMMER')).toBe("Session d'Été");
    expect(resolvePeriodLabel('SPRINT')).toBe('Sprint');
    expect(resolvePeriodLabel('WORKSHOP')).toBe('Atelier');
  });

  it('OTHER utilise le libellé personnalisé ou Autre', () => {
    expect(resolvePeriodLabel('OTHER', 'Sprint Ramadan')).toBe('Sprint Ramadan');
    expect(resolvePeriodLabel('OTHER')).toBe('Autre');
  });

  it("replit sur l'ancien champ puis le tiret", () => {
    expect(resolvePeriodLabel('UNKNOWN', undefined, 'Trimestre 2')).toBe('Trimestre 2');
    expect(resolvePeriodLabel(undefined)).toBe('—');
  });
});

describe('resolveStructureLabel', () => {
  it('préfère la variante listes (up1/departement1)', () => {
    expect(resolveStructureLabel({ libelle: 'Listes' }, { libelle: 'Détail' })).toBe('Listes');
  });

  it('replit sur la variante détail (up/departement)', () => {
    expect(resolveStructureLabel(undefined, { libelle: 'Détail' })).toBe('Détail');
    expect(resolveStructureLabel(null, { nom: 'Nom' })).toBe('Nom');
  });

  it('tiret quand rien', () => {
    expect(resolveStructureLabel(undefined, undefined)).toBe('—');
    expect(resolveStructureLabel({}, {})).toBe('—');
  });
});

describe('FicheFormation — bouton Modifier la formation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le bouton Modifier la formation pour un administrateur et navigue vers /home/Formation/Modifier/:id', () => {
    mockProfile = { role: 'admin', email: 'admin@esprit.tn' };
    render(
      <BrowserRouter>
        <FicheFormation />
      </BrowserRouter>,
    );

    const editBtn = screen.getByRole('button', { name: /modifier la formation/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(navigateMock).toHaveBeenCalledWith('/home/Formation/Modifier/42');
  });

  it('affiche le bouton Modifier la formation pour un CUP', () => {
    mockProfile = { role: 'ROLE_CUP', email: 'cup@esprit.tn' };
    render(
      <BrowserRouter>
        <FicheFormation />
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: /modifier la formation/i })).toBeInTheDocument();
  });

  it('affiche le bouton Modifier la formation pour un Chef de département', () => {
    mockProfile = { role: 'ROLE_CHEF_DEPARTEMENT', email: 'chef@esprit.tn' };
    render(
      <BrowserRouter>
        <FicheFormation />
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: /modifier la formation/i })).toBeInTheDocument();
  });

  it('masque le bouton Modifier la formation pour un enseignant', () => {
    mockProfile = { role: 'Enseignant', email: 'prof@esprit.tn' };
    render(
      <BrowserRouter>
        <FicheFormation />
      </BrowserRouter>,
    );

    expect(screen.queryByRole('button', { name: /modifier la formation/i })).not.toBeInTheDocument();
  });
});
