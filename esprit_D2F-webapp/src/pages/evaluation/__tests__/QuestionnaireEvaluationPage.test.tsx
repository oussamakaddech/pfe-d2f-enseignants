import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from 'antd';
import QuestionnaireEvaluationPage from '../QuestionnaireEvaluationPage';

const mutateAsync = vi.fn();

vi.mock('@/hooks/evaluation/useFormationFeedback', () => ({
  useFormationsAEvaluer: () => ({
    data: [
      {
        idFormation: 7,
        titreFormation: 'Formation XR',
        dateDebut: '2026-09-01',
        dateFin: '2026-09-03',
      },
      { idFormation: 8, titreFormation: 'MLOPS', dateDebut: '2026-09-07' },
    ],
    isLoading: false,
  }),
  useMesFormationsEvaluees: () => ({ data: [8] }),
  useSubmitFormationFeedback: () => ({ mutateAsync, isPending: false }),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({ message: { success: vi.fn(), error: vi.fn() } }),
}));

function renderPage() {
  render(
    <App>
      <QuestionnaireEvaluationPage />
    </App>,
  );
}

describe('QuestionnaireEvaluationPage', () => {
  beforeEach(() => mutateAsync.mockReset().mockResolvedValue(undefined));

  it('liste les formations : « Évaluer » pour celles à faire, « Évaluée » sinon', () => {
    renderPage();
    expect(screen.getByText('Formation XR')).toBeInTheDocument();
    expect(screen.getByText('Évaluée')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Évaluer/ })).toHaveLength(1);
  });

  it('« Envoyer » reste désactivé tant que les questions obligatoires ne sont pas remplies, puis envoie les notes 1 à 5', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Évaluer/ }));

    // Matrice : 3 aspects × 5 niveaux, comme le formulaire Microsoft Forms.
    expect(screen.getByText('Aspect organisationnel')).toBeInTheDocument();
    expect(screen.getAllByText('Très satisfaisant').length).toBeGreaterThan(0);
    const envoyer = screen.getByRole('button', { name: 'Envoyer' });
    expect(envoyer).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Aspect organisationnel : Satisfaisant'));
    fireEvent.click(screen.getByLabelText('Aspect technique : Très satisfaisant'));
    fireEvent.click(screen.getByLabelText('Aspect pédagogique : Moyennement satisfaisant'));
    expect(envoyer).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Oui'));
    fireEvent.change(screen.getAllByPlaceholderText('Entrez votre réponse')[1], {
      target: { value: 'Kubernetes avancé' },
    });
    expect(envoyer).toBeEnabled();

    fireEvent.click(envoyer);
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        formationId: 7,
        aspectOrganisationnel: 4,
        aspectTechnique: 5,
        aspectPedagogique: 3,
        besoinComplementaire: true,
        autresInformations: '',
        autresBesoins: 'Kubernetes avancé',
      }),
    );
    expect(await screen.findByText('Merci pour votre réponse')).toBeInTheDocument();
  });
});
