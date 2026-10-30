import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { Form } from 'antd';
import type { FormInstance } from 'antd';
import BesoinInfoStep from '../steps/BesoinInfoStep';

/**
 * Régression : l'import Excel écrivait `publicCible` via setFieldsValue mais
 * le compteur affichait « 0 participant » et le tableau restait vide.
 * Cause : aucun <Form.Item name="publicCible"> n'enregistrait le champ, et
 * rc-field-form useWatch ne notifie que les champs enregistrés (options.preserve
 * absent → lecture depuis getFieldsValue() restreint aux enregistrés).
 */
function Wrapper({ onForm }: { onForm: (form: FormInstance) => void }) {
  const [form] = Form.useForm();
  const fileRef = useRef<HTMLInputElement | null>(null);
  onForm(form);
  return (
    <Form form={form} preserve>
      <BesoinInfoStep
        ups={[]}
        departements={[]}
        participantsCount={0}
        lastImportCount={0}
        participantsFileInputRef={fileRef}
        onImportExcel={vi.fn()}
        onClearParticipants={vi.fn()}
      />
    </Form>
  );
}

describe('BesoinInfoStep publicCible', () => {
  it('le tableau reflete un publicCible pose par setFieldsValue (import Excel)', () => {
    let form!: FormInstance;
    render(<Wrapper onForm={(f) => (form = f)} />);
    // Avant import : vide.
    expect(screen.getByText(/Aucun participant/)).toBeInTheDocument();

    act(() => {
      form.setFieldsValue({
        publicCible:
          'Kaddech Oussama <oussama.kaddech@esprit.tn> (tél: +21620123456)\nJane Doe <jane@esprit.tn>',
      });
    });

    // Apres import : 2 lignes visibles (nom + email cliquable).
    expect(screen.getByText('Kaddech Oussama')).toBeInTheDocument();
    expect(screen.getByText('oussama.kaddech@esprit.tn')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText(/Aucun participant/)).not.toBeInTheDocument();
  });
});
