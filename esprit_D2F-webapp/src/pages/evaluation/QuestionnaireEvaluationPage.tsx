import { useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Radio, Result, Spin, Tag } from 'antd';
import { CheckCircleFilled, FormOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useFormationsAEvaluer,
  useMesFormationsEvaluees,
  useSubmitFormationFeedback,
} from '@/hooks/evaluation/useFormationFeedback';
import {
  ASPECTS,
  NIVEAUX_SATISFACTION,
  type FormationAEvaluer,
} from '@/services/evaluation/FormationFeedbackService';
import '@/styles/pages/questionnaire-evaluation.css';

const { TextArea } = Input;

type AspectKey = (typeof ASPECTS)[number]['key'];

interface Reponses {
  notes: Partial<Record<AspectKey, number>>;
  besoinComplementaire?: boolean;
  autresInformations: string;
  autresBesoins: string;
}

const VIDE: Reponses = { notes: {}, autresInformations: '', autresBesoins: '' };

function periode(f: FormationAEvaluer): string {
  if (!f.dateDebut) return '';
  const deb = dayjs(f.dateDebut).format('DD/MM/YYYY');
  return f.dateFin && f.dateFin !== f.dateDebut
    ? `du ${deb} au ${dayjs(f.dateFin).format('DD/MM/YYYY')}`
    : `le ${deb}`;
}

/**
 * Questionnaire de satisfaction (modèle « Évaluation des formations ») :
 * 3 aspects notés de « Pas du tout satisfaisant » à « Très satisfaisant »,
 * besoin de formation complémentaire, remarques libres. Une réponse par
 * participant et par formation (contrôlé par le serveur).
 */
export default function QuestionnaireEvaluationPage() {
  const { message } = useAppNotification();
  const { data: formations = [], isLoading } = useFormationsAEvaluer();
  const { data: evaluees = [] } = useMesFormationsEvaluees();
  const submit = useSubmitFormationFeedback();
  const [selection, setSelection] = useState<FormationAEvaluer | null>(null);
  const [reponses, setReponses] = useState<Reponses>(VIDE);
  const [envoyee, setEnvoyee] = useState<string | null>(null);

  const dejaEvaluees = useMemo(() => new Set(evaluees), [evaluees]);
  const complet =
    ASPECTS.every((a) => reponses.notes[a.key] != null) && reponses.besoinComplementaire != null;

  const ouvrir = (f: FormationAEvaluer) => {
    setSelection(f);
    setReponses(VIDE);
    setEnvoyee(null);
  };

  const envoyer = async () => {
    if (!selection || !complet) return;
    try {
      await submit.mutateAsync({
        formationId: selection.idFormation,
        aspectOrganisationnel: reponses.notes.aspectOrganisationnel!,
        aspectTechnique: reponses.notes.aspectTechnique!,
        aspectPedagogique: reponses.notes.aspectPedagogique!,
        besoinComplementaire: reponses.besoinComplementaire!,
        autresInformations: reponses.autresInformations,
        autresBesoins: reponses.autresBesoins,
      });
      setEnvoyee(selection.titreFormation);
      setSelection(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message ?? 'Envoi impossible : réessayez plus tard.');
    }
  };

  if (isLoading) {
    return (
      <div className="qe-page qe-page--center">
        <Spin size="large" />
      </div>
    );
  }

  if (selection) {
    return (
      <div className="qe-page">
        <Card className="qe-form">
          <h2 className="qe-form__title">Évaluation des formations</h2>
          <p className="qe-form__subtitle">
            {selection.titreFormation} {periode(selection) && `· ${periode(selection)}`}
          </p>

          <section className="qe-question">
            <h3 className="qe-question__label">
              1. {selection.titreFormation} <span className="qe-required">*</span>
            </h3>
            <div className="qe-matrix-wrapper">
              <table className="qe-matrix">
                <thead>
                  <tr>
                    <th aria-label="Aspect" />
                    {NIVEAUX_SATISFACTION.map((n) => (
                      <th key={n} scope="col">
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ASPECTS.map((a) => (
                    <tr key={a.key} role="radiogroup" aria-label={a.label}>
                      <th scope="row">{a.label}</th>
                      {NIVEAUX_SATISFACTION.map((n, i) => (
                        <td key={n}>
                          <Radio
                            aria-label={`${a.label} : ${n}`}
                            checked={reponses.notes[a.key] === i + 1}
                            onChange={() =>
                              setReponses((r) => ({ ...r, notes: { ...r.notes, [a.key]: i + 1 } }))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="qe-question">
            <h3 className="qe-question__label">
              2. Avez-vous besoin d'une formation complémentaire dans le même domaine ?{' '}
              <span className="qe-required">*</span>
            </h3>
            <Radio.Group
              className="qe-choices"
              value={reponses.besoinComplementaire}
              onChange={(e) => setReponses((r) => ({ ...r, besoinComplementaire: e.target.value }))}
            >
              <Radio value={true}>Oui</Radio>
              <Radio value={false}>Non</Radio>
            </Radio.Group>
          </section>

          <section className="qe-question">
            <h3 className="qe-question__label">3. Avez-vous d'autres informations à signaler ?</h3>
            <TextArea
              placeholder="Entrez votre réponse"
              autoSize={{ minRows: 2, maxRows: 6 }}
              maxLength={2000}
              value={reponses.autresInformations}
              onChange={(e) => setReponses((r) => ({ ...r, autresInformations: e.target.value }))}
            />
          </section>

          <section className="qe-question">
            <h3 className="qe-question__label">
              4. Avez-vous d'autres besoins en formation pour de futures sessions ?
            </h3>
            <TextArea
              placeholder="Entrez votre réponse"
              autoSize={{ minRows: 2, maxRows: 6 }}
              maxLength={2000}
              value={reponses.autresBesoins}
              onChange={(e) => setReponses((r) => ({ ...r, autresBesoins: e.target.value }))}
            />
          </section>

          <div className="qe-actions">
            <Button size="large" onClick={() => setSelection(null)}>
              Précédent
            </Button>
            <Button
              type="primary"
              size="large"
              disabled={!complet}
              loading={submit.isPending}
              onClick={envoyer}
            >
              Envoyer
            </Button>
          </div>
          {!complet && (
            <p className="qe-hint">Répondez aux questions marquées * pour pouvoir envoyer.</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="qe-page">
      {envoyee && (
        <Result
          status="success"
          title="Merci pour votre réponse"
          subTitle={`Votre évaluation de « ${envoyee} » a bien été envoyée.`}
          className="qe-result"
        />
      )}
      <Card className="qe-form">
        <h2 className="qe-form__title">Évaluation des formations</h2>
        <p className="qe-form__subtitle">
          Choisissez la formation à évaluer. Vos réponses sont anonymes dans les statistiques.
        </p>
        {formations.length === 0 ? (
          <Empty description="Aucune formation en cours ou achevée à évaluer pour le moment." />
        ) : (
          <ul className="qe-list">
            {formations.map((f) => {
              const faite = dejaEvaluees.has(f.idFormation);
              return (
                <li key={f.idFormation} className="qe-list__item">
                  <div>
                    <div className="qe-list__title">{f.titreFormation}</div>
                    <div className="qe-list__meta">{periode(f)}</div>
                  </div>
                  {faite ? (
                    <Tag icon={<CheckCircleFilled />} color="success">
                      Évaluée
                    </Tag>
                  ) : (
                    <Button type="primary" icon={<FormOutlined />} onClick={() => ouvrir(f)}>
                      Évaluer
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {formations.length > 0 && formations.every((f) => dejaEvaluees.has(f.idFormation)) && (
          <Alert type="success" showIcon message="Vous avez évalué toutes vos formations." />
        )}
      </Card>
    </div>
  );
}
