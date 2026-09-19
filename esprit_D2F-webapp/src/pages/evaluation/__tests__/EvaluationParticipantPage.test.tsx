import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import EvaluationParticipantPage from '../EvaluationParticipantPage';

vi.mock('@/hooks/evaluation/useEvaluations', () => ({
  useEvaluationsParticipants: () => ({ data: [], isLoading: false }),
  useCreateEvaluationParticipant: () => ({ mutateAsync: vi.fn() }),
  useUpdateEvaluationParticipant: () => ({ mutateAsync: vi.fn() }),
  useDeleteEvaluationParticipant: () => ({ mutateAsync: vi.fn() }),
  useValiderCompetences: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/formation/useFormations', () => ({
  useAllFormations: () => ({
    data: [
      {
        idFormation: 1,
        titreFormation: 'Formation Test',
        seances: [
          {
            idSeance: 10,
            animateurs: [{ id: 'E1', nom: 'Anim', prenom: 'Al', mail: 'a@t.tn' }],
            participants: [{ id: 'E2', nom: 'Part', prenom: 'Pa', mail: 'p@t.tn' }],
          },
        ],
      },
    ],
  }),
}));

vi.mock('@/hooks/enseignant', () => ({
  useEnseignants: () => ({
    data: [
      { id: 'E1', nom: 'Anim', prenom: 'Al', mail: 'a@t.tn' },
      { id: 'E2', nom: 'Part', prenom: 'Pa', mail: 'p@t.tn' },
      { id: 'E3', nom: 'Out', prenom: 'Si', mail: 'o@t.tn' },
    ],
  }),
}));

vi.mock('@/routes/guards', () => ({
  useHasPermission: () => true,
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({
    message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  }),
}));

function openDrawer() {
  render(
    <BrowserRouter>
      <App>
        <EvaluationParticipantPage />
      </App>
    </BrowserRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Ajouter une évaluation/i }));
}

async function chooseFormSelect(formItemLabel: string, optionText: string) {
  const drawer = document.querySelector('.evaluation-drawer') as HTMLElement;
  const label = within(drawer).getByText(formItemLabel);
  const item = label.closest('.ant-form-item') as HTMLElement;
  const selector = item.querySelector('.ant-select-selector') as HTMLElement;
  fireEvent.mouseDown(selector);
  const option = await waitFor(() => {
    const el = Array.from(document.querySelectorAll('.ant-select-item-option-content')).find(
      (n) => n.textContent?.includes(optionText),
    );
    expect(el).toBeTruthy();
    return el as HTMLElement;
  });
  fireEvent.click(option.closest('.ant-select-item-option') as HTMLElement);
}

describe('EvaluationParticipantPage — filtre enseignant par formation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne propose que les membres de la formation selectionnee', async () => {
    openDrawer();
    await chooseFormSelect('Formation', 'Formation Test');
    await chooseFormSelect('Enseignant évalué', 'Al Anim');

    // L'option du membre existe (valeur affichee + option) et a pu etre choisie.
    const drawer = document.body;
    expect(within(drawer).getAllByText(/Al Anim/).length).toBeGreaterThan(0);

    // L'outsider E3 ne doit pas apparaître dans les options enseignant.
    const drawerEl = document.querySelector('.evaluation-drawer') as HTMLElement;
    fireEvent.mouseDown(
      within(drawerEl)
        .getByText('Enseignant évalué')
        .closest('.ant-form-item')!
        .querySelector('.ant-select-selector')!,
    );
    await waitFor(() => {
      expect(document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toBeTruthy();
    });
    const contents = Array.from(
      document.querySelectorAll('.ant-select-item-option-content'),
    ).map((n) => n.textContent);
    expect(contents.some((t) => t?.includes('Si Out'))).toBe(false);
  });
});
