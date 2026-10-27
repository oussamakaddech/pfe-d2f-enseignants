import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsultationTab from '../ConsultationTab';
import type useStructureData from '@/hooks/competence/useStructureData';

vi.mock('@/hooks/formation/useUpCrud', () => ({
  useAllUps: () => ({
    data: [
      { id: 10, name: 'UP Génie Civil' },
      { id: 20, name: 'UP Informatique' },
    ],
  }),
}));

vi.mock('@/hooks/formation/useDeptCrud', () => ({
  useAllDepts: () => ({
    data: [
      { id: 100, name: 'Département GC' },
      { id: 200, name: 'Département INFO' },
    ],
  }),
}));

vi.mock('../consultation/ViewToolbar', () => ({ default: () => null }));
vi.mock('../consultation/SavoirDetailDrawer', () => ({ default: () => null }));
vi.mock('../StructureSearchResultsView', () => ({ default: () => null }));

function makeStructure() {
  return {
    // L'arbre n'est pas chargé : le filtre domaine doit malgré tout être rempli
    // à partir des domaines du CRUD (régression : liste déroulante vide).
    structure: null,
    structureLoading: false,
    searchLoading: false,
    searchResults: null,
    selectedDomaine: null,
    setSelectedDomaine: vi.fn(),
    applyFilter: vi.fn(),
    loadStructure: vi.fn(),
    setSearchKeyword: vi.fn(),
    handleSearch: vi.fn(),
    handleClearSearch: vi.fn(),
  } as unknown as ReturnType<typeof useStructureData>;
}

const crud = {
  // Les domaines gardent leur rattachement historique : il sert de repli pour
  // les compétences qui n'ont pas de rattachement explicite (avant la V24).
  domaines: [
    { id: 1, code: 'GC', nom: 'Génie Civil', upId: '10', departementId: '100' },
    { id: 2, code: 'INFO', nom: 'Informatique', upId: '20', departementId: '200' },
  ],
  competences: [
    { id: 11, code: 'GC-TECH', nom: 'Techniques GC', domaineId: 1 },
    { id: 21, code: 'INFO-WEB', nom: 'Web', domaineId: 2 },
  ],
  sousComps: [],
  savoirs: [],
};

function selectFor(placeholder: string | RegExp): HTMLElement {
  const node = screen.getByText(placeholder).closest('.ant-select');
  if (!node) throw new Error(`Select introuvable pour « ${String(placeholder)} »`);
  return node as HTMLElement;
}

function openSelect(placeholder: string | RegExp): HTMLElement {
  const select = selectFor(placeholder);
  fireEvent.mouseDown(select.querySelector('.ant-select-selector') as Element);
  const dropdown = document.querySelector(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  ) as HTMLElement | null;
  if (!dropdown) throw new Error('Liste déroulante non ouverte');
  return dropdown;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('ConsultationTab — filtre par domaine', () => {
  it('remplit la liste des domaines depuis le CRUD même sans arbre chargé', () => {
    render(<ConsultationTab structure={makeStructure()} crud={crud} handleExportExcel={vi.fn()} />);

    const dropdown = openSelect('Filtrer par domaine');

    expect(within(dropdown).getByText('Génie Civil')).toBeInTheDocument();
    expect(within(dropdown).getByText('Informatique')).toBeInTheDocument();
  });

  it('restreint les domaines proposés quand une UP est sélectionnée', () => {
    const structure = makeStructure();
    render(<ConsultationTab structure={structure} crud={crud} handleExportExcel={vi.fn()} />);

    const upDropdown = openSelect('Filtrer par UP');
    fireEvent.click(within(upDropdown).getByText('UP Génie Civil'));

    expect(structure.applyFilter).toHaveBeenCalledWith(10, null);

    const domaineDropdown = openSelect('Filtrer par domaine');
    expect(within(domaineDropdown).getByText('Génie Civil')).toBeInTheDocument();
    expect(within(domaineDropdown).queryByText('Informatique')).not.toBeInTheDocument();
  });

  it('suit le rattachement porté par la compétence, pas celui du domaine', () => {
    const structure = makeStructure();
    // La compétence « Web » (domaine Informatique) est explicitement rattachée
    // à la UP Génie Civil : son domaine devient proposé sous ce filtre.
    const crudWithOverride = {
      ...crud,
      competences: [
        { id: 11, code: 'GC-TECH', nom: 'Techniques GC', domaineId: 1 },
        { id: 21, code: 'INFO-WEB', nom: 'Web', domaineId: 2, upIds: ['10'] },
      ],
    };
    render(
      <ConsultationTab structure={structure} crud={crudWithOverride} handleExportExcel={vi.fn()} />,
    );

    const upDropdown = openSelect('Filtrer par UP');
    fireEvent.click(within(upDropdown).getByText('UP Génie Civil'));

    const domaineDropdown = openSelect('Filtrer par domaine');
    expect(within(domaineDropdown).getByText('Génie Civil')).toBeInTheDocument();
    expect(within(domaineDropdown).getByText('Informatique')).toBeInTheDocument();
  });
});
