import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';

// ── Mocks services ──
const mockCreateAccount = vi.fn();
vi.mock('@/services/auth/AccountService', () => ({
  createAccount: (...args: unknown[]) => mockCreateAccount(...args),
}));

const mockCreateEnseignantWithAccount = vi.fn();
vi.mock('@/services/formation/EnseignantService', () => ({
  default: {
    createEnseignantWithAccount: (...args: unknown[]) => mockCreateEnseignantWithAccount(...args),
  },
}));

// ── Mocks hooks ──
const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: () => ({ message: { success: mockSuccess, error: mockError } }),
}));

// UPs et départements vides par défaut
vi.mock('@/hooks/formation/useDeptCrud', () => ({
  useAllDepts: () => ({ data: [] }),
}));
vi.mock('@/hooks/formation/useUpCrud', () => ({
  useAllUps: () => ({ data: [] }),
}));

import CreateAccountDrawer from '../CreateAccountDrawer';

function renderDrawer(
  props: { open?: boolean; onSuccess?: () => void; initialValues?: Record<string, string> } = {},
) {
  const { open = true, onSuccess, initialValues } = props;
  return render(
    <BrowserRouter>
      <App>
        <CreateAccountDrawer
          open={open}
          onClose={vi.fn()}
          onSuccess={onSuccess ?? vi.fn()}
          initialValues={initialValues}
        />
      </App>
    </BrowserRouter>,
  );
}

/** Récupère l'<input> dans le Form.Item dont le label contient `labelText`. */
function getFieldByLabel(labelText: string): HTMLElement {
  const formItem = Array.from(document.querySelectorAll('.ant-form-item')).find((el) => {
    const label = el.querySelector('.ant-form-item-label');
    return label && label.textContent && label.textContent.includes(labelText);
  });
  const input = formItem?.querySelector('input');
  if (!input) throw new Error(`Champ avec label "${labelText}" introuvable`);
  return input as HTMLElement;
}

/** Remplit tous les champs requis d'un compte (sans toucher au rôle). */
function fillBaseAccountFields() {
  fireEvent.change(getFieldByLabel('Prénom'), { target: { value: 'Ahmed' } });
  fireEvent.change(getFieldByLabel('Nom'), { target: { value: 'Benali' } });
  fireEvent.change(getFieldByLabel('Adresse email'), {
    target: { value: 'ahmed.benali@esprit.tn' },
  });
  fireEvent.change(getFieldByLabel('Téléphone'), { target: { value: '0612345678' } });
  fireEvent.change(getFieldByLabel("Nom d'utilisateur"), { target: { value: 'ahmed.benali' } });
  fireEvent.change(getFieldByLabel('Mot de passe'), { target: { value: 'Password1!' } });
  fireEvent.change(getFieldByLabel('Confirmer le mot de passe'), {
    target: { value: 'Password1!' },
  });
}

describe('CreateAccountDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("s'ouvre et affiche le formulaire de création", () => {
    renderDrawer({ open: true });
    expect(screen.getByText('Créer un compte')).toBeInTheDocument();
    expect(screen.getByText(/Renseignez les informations du nouveau compte/)).toBeInTheDocument();
  });

  it('affiche les sections profil enseignant pour le rôle ENSEIGNANT (par défaut)', () => {
    renderDrawer();
    expect(screen.getByText(/profil enseignant/i)).toBeInTheDocument();
    expect(screen.getByText(/Grade académique/i)).toBeInTheDocument();
  });

  it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
    renderDrawer();
    fillBaseAccountFields();

    // Rendre le confirmPassword différent
    const confirmField = getFieldByLabel('Confirmer le mot de passe');
    fireEvent.change(confirmField, { target: { value: 'Different2!' } });

    const submitBtn = screen.getByRole('button', { name: /créer le compte/i });
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        const match = screen
          .getAllByText(
            (_content, element) =>
              !!element &&
              element.textContent?.toLowerCase().includes('ne correspondent pas') === true,
          )
          .some((el) => el.textContent?.toLowerCase().includes('ne correspondent pas'));
        expect(match).toBe(true);
      },
      { timeout: 5000 },
    );
    // Aucun service ne doit être appelé
    expect(mockCreateAccount).not.toHaveBeenCalled();
    expect(mockCreateEnseignantWithAccount).not.toHaveBeenCalled();
  });

  it('crée un compte ENSEIGNANT via EnseignantService.createEnseignantWithAccount', async () => {
    mockCreateEnseignantWithAccount.mockResolvedValueOnce({ id: 1, nom: 'Benali' });
    const onSuccess = vi.fn();
    renderDrawer({ onSuccess });

    fillBaseAccountFields();

    const submitBtn = screen.getByRole('button', { name: /créer le compte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateEnseignantWithAccount).toHaveBeenCalledTimes(1);
    });

    // Vérifie que le payload contient les bonnes infos
    const [payload, role] = mockCreateEnseignantWithAccount.mock.calls[0];
    expect(role).toBe('ENSEIGNANT');
    expect(payload.username).toBe('ahmed.benali');
    expect(payload.password).toBe('Password1!');
    expect(payload.email).toBe('ahmed.benali@esprit.tn');
    expect(payload.firstName).toBe('Ahmed');
    expect(payload.lastName).toBe('Benali');

    expect(mockSuccess).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('crée un compte RESPONSABLE_DOSSIER via createAccount (sans fiche enseignant)', async () => {
    mockCreateAccount.mockResolvedValueOnce({ userId: 1, username: 'resp1' });
    renderDrawer();

    fillBaseAccountFields();

    // Changer le rôle en RESPONSABLE_DOSSIER via le Select
    const roleFormItem = Array.from(document.querySelectorAll('.ant-form-item')).find((el) => {
      const label = el.querySelector('.ant-form-item-label');
      return label && label.textContent && label.textContent.includes('Rôle');
    });
    const roleSelector = roleFormItem!.querySelector('.ant-select-selector')!;
    fireEvent.mouseDown(roleSelector);
    await waitFor(() => {
      expect(screen.getByText('Responsable dossier')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Responsable dossier'));

    // La section profil enseignant doit disparaître
    await waitFor(() => {
      expect(screen.queryByText(/profil enseignant/i)).not.toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /créer le compte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledTimes(1);
    });

    const [payload, role] = mockCreateAccount.mock.calls[0];
    expect(role).toBe('RESPONSABLE_DOSSIER');
    expect(payload.username).toBe('ahmed.benali');
    expect(payload.password).toBe('Password1!');

    // Pas de fiche enseignant pour ce rôle
    expect(mockCreateEnseignantWithAccount).not.toHaveBeenCalled();
  });

  it("gère l'erreur 409 (email déjà utilisé)", async () => {
    mockCreateEnseignantWithAccount.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Error: Email is already in use!' } },
    });
    renderDrawer();

    fillBaseAccountFields();

    const submitBtn = screen.getByRole('button', { name: /créer le compte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining('adresse e-mail est déjà utilisée'),
      );
    });
  });

  it("gère l'erreur 409 (username déjà pris)", async () => {
    mockCreateEnseignantWithAccount.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Error: Username is already taken!' } },
    });
    renderDrawer();

    fillBaseAccountFields();

    const submitBtn = screen.getByRole('button', { name: /créer le compte/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("nom d'utilisateur"));
    });
  });
});
