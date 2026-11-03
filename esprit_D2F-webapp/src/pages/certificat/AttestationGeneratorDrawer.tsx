import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { useAllFormations, useFormationReportFetch } from '@/hooks/formation';
import type { Enseignant } from '@/hooks/enseignant';
import {
  ATTESTATION_HEADERS,
  attestationFileName,
  attestationTitle,
  buildAttestationPdf,
  teacherFullName,
  type AttestationRow,
  type AttestationType,
} from '@/utils/pdf/attestationPdf';

const { Text, Title } = Typography;

export interface AttestationGeneratorDrawerProps {
  open: boolean;
  onClose: () => void;
  enseignants: Enseignant[];
  loadingEnseignants: boolean;
  /** Modèle sélectionné depuis l'en-tête de la page (Participation par défaut). */
  initialType?: AttestationType;
}

const TYPE_OPTIONS = [
  { label: 'Participation', value: 'PARTICIPATION' as AttestationType },
  { label: 'Animation', value: 'ANIMATION' as AttestationType },
];

const TYPE_HINTS: Record<AttestationType, string> = {
  PARTICIPATION: "Attestation de participation à des formations — l'enseignant a suivi les formations listées.",
  ANIMATION: "Attestation d'animation d'une formation — l'enseignant a animé les formations listées.",
};

/** Ligne éditable du tableau, calquée sur les colonnes du modèle Word. */
interface EditableRow {
  key: string;
  titreFormation: string;
  /** Formateurs sélectionnés (libellés « Prénom NOM », modifiables et multiples). */
  formateurs: string[];
  dateDebut: Dayjs | null;
  heures: string;
  publicCible: string;
  objectifs: string;
}

let rowSeq = 0;
const newRow = (): EditableRow => ({
  key: `row-${++rowSeq}`,
  titreFormation: '',
  formateurs: [],
  dateDebut: null,
  heures: '',
  publicCible: '',
  objectifs: '',
});

const formateursLabels = (row: AttestationRow): string[] => {
  const libre = (row.formateursLibelle ?? '').trim();
  if (libre) return libre.split(/\s*,\s*/).filter(Boolean);
  return (row.formateurs ?? [])
    .map((f) => `${(f.prenom ?? '').trim()} ${(f.nom ?? '').trim().toUpperCase()}`.trim())
    .filter(Boolean);
};

/** Ligne renvoyée par `FormationReportService` → ligne éditable. */
const toEditableRow = (raw: AttestationRow): EditableRow => ({
  key: `row-${++rowSeq}`,
  titreFormation: raw.titreFormation ?? '',
  formateurs: formateursLabels(raw),
  dateDebut: raw.dateDebut && dayjs(raw.dateDebut).isValid() ? dayjs(raw.dateDebut) : null,
  heures:
    raw.chargeHoraireGlobal == null || raw.chargeHoraireGlobal === ''
      ? ''
      : String(raw.chargeHoraireGlobal),
  publicCible: raw.populationCible ?? '',
  objectifs: raw.objectifs ?? '',
});

const toPdfRow = (row: EditableRow): AttestationRow => ({
  titreFormation: row.titreFormation.trim(),
  formateursLibelle: row.formateurs.join(', ').trim(),
  dateDebut: row.dateDebut ? row.dateDebut.format('YYYY-MM-DD') : undefined,
  chargeHoraireGlobal: row.heures.trim() || undefined,
  populationCible: row.publicCible.trim() || undefined,
  objectifs: row.objectifs.trim() || undefined,
});

export default function AttestationGeneratorDrawer({
  open,
  onClose,
  enseignants,
  loadingEnseignants,
  initialType,
}: Readonly<AttestationGeneratorDrawerProps>) {
  const { message } = useAppNotification();
  const reportFetch = useFormationReportFetch();
  const formationsQuery = useAllFormations();
  const [type, setType] = useState<AttestationType>(initialType ?? 'PARTICIPATION');
  const [enseignantId, setEnseignantId] = useState<string | undefined>();
  const [departement, setDepartement] = useState('');
  const [period, setPeriod] = useState<Dayjs[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const docRef = useRef<{ save: (name: string) => void } | null>(null);
  const urlRef = useRef<string | null>(null);

  // Chaque ouverture repart du modèle choisi dans l'en-tête, sans aperçu résiduel.
  useEffect(() => {
    if (!open) return;
    if (initialType) setType(initialType);
    setRows([]);
    setPdfUrl(null);
    docRef.current = null;
  }, [open, initialType]);

  const selected = useMemo(
    () => enseignants.find((e) => String(e.id) === String(enseignantId)),
    [enseignants, enseignantId],
  );

  const options = useMemo(
    () =>
      enseignants.map((e) => {
        const dept = (e.deptLibelle as string | undefined) ?? '';
        const label = `${teacherFullName({ nom: e.nom, prenom: e.prenom })}${dept ? ` — ${dept}` : ''}`;
        return { value: String(e.id), label };
      }),
    [enseignants],
  );

  /** Liste roulante des formateurs disponibles : « Prénom NOM ». */
  const formateurOptions = useMemo(() => {
    const names = new Set<string>();
    enseignants.forEach((e) => {
      const name = teacherFullName({ nom: e.nom, prenom: e.prenom });
      if (name) names.add(name);
    });
    rows.forEach((row) => row.formateurs.forEach((name) => names.add(name)));
    return [...names].sort((a, b) => a.localeCompare(b, 'fr')).map((name) => ({
      value: name,
      label: name,
    }));
  }, [enseignants, rows]);

  /** Liste roulante des formations (titres) : toutes les formations + titres déjà saisis. */
  const formationTitles = useMemo(() => {
    const titles = new Set<string>();
    (formationsQuery.data ?? []).forEach((f) => {
      if (f.titreFormation) titles.add(f.titreFormation);
    });
    rows.forEach((row) => {
      if (row.titreFormation) titles.add(row.titreFormation);
    });
    return [...titles].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [formationsQuery.data, rows]);

  const formationOptions = useMemo(
    () => formationTitles.map((title) => ({ value: title, label: title })),
    [formationTitles],
  );

  /** Le département est prérempli depuis la fiche, mais reste modifiable (modèle Word). */
  useEffect(() => {
    if (selected) setDepartement((selected.deptLibelle as string | undefined) ?? '');
  }, [selected]);

  const teacher = useMemo(
    () => ({
      nom: selected?.nom,
      prenom: selected?.prenom,
      departement: departement.trim(),
    }),
    [selected, departement],
  );

  /** Aperçu PDF en direct (débattu pour ne pas régénérer à chaque frappe). */
  useEffect(() => {
    if (!open || !selected || rows.length === 0) {
      setPdfUrl(null);
      docRef.current = null;
      return;
    }
    const timer = setTimeout(() => {
      const doc = buildAttestationPdf({
        type,
        teacher,
        rows: rows.map(toPdfRow),
      });
      const url = doc.output('bloburl') as unknown as string;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      docRef.current = doc;
      setPdfUrl(url);
    }, 350);
    return () => clearTimeout(timer);
  }, [open, selected, teacher, rows, type]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const close = () => {
    setPdfUrl(null);
    docRef.current = null;
    onClose();
  };

  const loadRows = async () => {
    if (!selected || period.length !== 2) {
      message.warning('Sélectionnez un enseignant et une période.');
      return;
    }
    setLoadingRows(true);
    try {
      const [start, end] = period.map((d) => d.format('YYYY-MM-DD'));
      const raw = await reportFetch.mutateAsync({
        role: type === 'ANIMATION' ? 'animateur' : 'participant',
        enseignantId: selected.id!,
        start,
        end,
      });
      const loaded = (Array.isArray(raw) ? raw : []).map((r) =>
        toEditableRow(r as AttestationRow),
      );
      if (loaded.length === 0) {
        message.warning(
          `Aucune formation ${type === 'ANIMATION' ? 'animée' : 'suivie'} sur cette période.`,
        );
        return;
      }
      setRows(loaded);
    } catch {
      message.error('Échec du chargement des formations.');
    } finally {
      setLoadingRows(false);
    }
  };

  const patchRow = (key: string, patch: Partial<EditableRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  /** Crée une ligne préremplie depuis une formation du catalogue. */
  const rowFromFormation = (titre: string): EditableRow => {
    const f = (formationsQuery.data ?? []).find((item) => item.titreFormation === titre);
    const animateurs = (f?.animateurs ?? [])
      .map((p) => teacherFullName({ nom: p.nom, prenom: p.prenom }))
      .filter(Boolean);
    return {
      ...newRow(),
      titreFormation: titre,
      formateurs: animateurs,
      dateDebut: f?.dateDebut && dayjs(f.dateDebut).isValid() ? dayjs(f.dateDebut) : null,
      heures: f?.chargeHoraireGlobal == null ? '' : String(f.chargeHoraireGlobal),
      publicCible: f?.populationCible ?? '',
      objectifs: f?.objectifs ?? '',
    };
  };

  /** Le choix d'une formation dans la liste roulante récupère ses informations. */
  const applyFormation = (key: string, titre: string) => {
    const filled = rowFromFormation(titre);
    patchRow(key, {
      titreFormation: titre,
      ...(filled.formateurs.length > 0 ? { formateurs: filled.formateurs } : {}),
      ...(filled.dateDebut ? { dateDebut: filled.dateDebut } : {}),
      ...(filled.heures ? { heures: filled.heures } : {}),
      ...(filled.publicCible ? { publicCible: filled.publicCible } : {}),
      ...(filled.objectifs ? { objectifs: filled.objectifs } : {}),
    });
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((row) => row.key !== key));

  const download = () => {
    if (!docRef.current || !selected) return;
    docRef.current.save(
      attestationFileName(type, { nom: selected.nom, prenom: selected.prenom }, new Date()),
    );
  };

  const ready = Boolean(selected) && rows.length > 0;

  return (
    <Drawer
      title={<span style={{ fontWeight: 600 }}>{attestationTitle(type)}</span>}
      width={1120}
      open={open}
      onClose={close}
      destroyOnClose
      footer={
        <div className="gcert-attestation-footer">
          <Button onClick={close}>Fermer</Button>
          <Space>
            <Button onClick={() => setRows([newRow()])}>Réinitialiser</Button>
            <Button type="primary" disabled={!pdfUrl} onClick={download}>
              Télécharger le PDF
            </Button>
          </Space>
        </div>
      }
    >
      <div className="gcert-attestation-layout">
        {/* ── Colonne formulaire : structure du document Word ─────────────── */}
        <div className="gcert-attestation-form">
          <section className="gcert-attestation-section">
            <Title level={5} className="gcert-attestation-section-title">
              1. Modèle du document
            </Title>
            <Segmented
              block
              value={type}
              onChange={(v) => {
                setType(v as AttestationType);
                setRows([]);
              }}
              options={TYPE_OPTIONS}
            />
            <Text type="secondary" className="gcert-attestation-hint">
              {TYPE_HINTS[type]}
            </Text>
          </section>

          <section className="gcert-attestation-section">
            <Title level={5} className="gcert-attestation-section-title">
              2. Enseignant concerné
            </Title>
            <label className="gcert-attestation-field">
              <Text strong>Enseignant</Text>
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Rechercher un enseignant…"
                style={{ width: '100%' }}
                loading={loadingEnseignants}
                value={enseignantId}
                onChange={(value) => {
                  setEnseignantId(value);
                  setRows([]);
                }}
                options={options}
              />
            </label>
            <label className="gcert-attestation-field">
              <Text strong>Département</Text>
              <Input
                placeholder="Département mentionné dans l'attestation"
                value={departement}
                onChange={(e) => setDepartement(e.target.value)}
                allowClear
              />
            </label>
            <Text type="secondary" className="gcert-attestation-hint">
              Phrase du modèle : « … enseignante titulaire
              {departement.trim() ? ` au sein du département ${departement.trim()}` : ''} à ESPRIT, … »
            </Text>
          </section>

          <section className="gcert-attestation-section">
            <Title level={5} className="gcert-attestation-section-title">
              3. Formations {type === 'ANIMATION' ? 'animées' : 'suivies'}
            </Title>
            <Space.Compact style={{ width: '100%' }}>
              <DatePicker.RangePicker
                style={{ flex: 1 }}
                format="DD/MM/YYYY"
                value={period.length === 2 ? (period as [Dayjs, Dayjs]) : null}
                onChange={(dates) =>
                  setPeriod(((dates ?? []) as (Dayjs | null)[]).filter((d): d is Dayjs => d !== null))
                }
              />
              <Button
                icon={<ReloadOutlined />}
                loading={loadingRows}
                disabled={!selected || period.length !== 2}
                onClick={() => void loadRows()}
              >
                Charger
              </Button>
            </Space.Compact>
            <Text type="secondary" className="gcert-attestation-hint">
              Les formations de la période sont préremplies ; chaque cellule reste modifiable, comme
              dans le modèle Word.
            </Text>

            <label className="gcert-attestation-field">
              <Text strong>Formations à attester</Text>
              <Select
                mode="multiple"
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder="Choisir une ou plusieurs formations…"
                listHeight={260}
                maxTagCount="responsive"
                value={[]}
                options={formationOptions}
                loading={formationsQuery.isLoading}
                onChange={(titles: string[]) => {
                  const added = titles
                    .filter((title) => !rows.some((row) => row.titreFormation === title))
                    .map(rowFromFormation);
                  if (added.length > 0) setRows((prev) => [...prev, ...added]);
                }}
              />
              <Text type="secondary" className="gcert-attestation-hint">
                Chaque sélection ajoute une ligne préremplie (formateur(s), date, heures, public cible
                et objectifs) à partir de la formation choisie.
              </Text>
            </label>

            <div className="gcert-attestation-columns">
              {ATTESTATION_HEADERS[type].map((header) => (
                <Tag key={header}>{header}</Tag>
              ))}
            </div>

            {rows.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chargez les formations de la période ou ajoutez une ligne manuellement."
              >
                <Button icon={<PlusOutlined />} onClick={() => setRows([newRow()])}>
                  Ajouter une formation
                </Button>
              </Empty>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {rows.map((row, index) => (
                  <div key={row.key} className="gcert-attestation-row">
                    <div className="gcert-attestation-row-head">
                      <Text strong>Formation {index + 1}</Text>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeRow(row.key)}
                      />
                    </div>
                    <div className="gcert-attestation-row-grid">
                      <label className="gcert-attestation-field">
                        <Text type="secondary">Formation</Text>
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="Choisir une formation…"
                          listHeight={240}
                          value={row.titreFormation || undefined}
                          options={formationOptions}
                          onChange={(title: string) => applyFormation(row.key, title)}
                        />
                      </label>
                      <label className="gcert-attestation-field">
                        <Text type="secondary">
                          {type === 'ANIMATION' ? 'Formateur(s)' : 'Formateur'}
                        </Text>
                        <Select
                          mode="multiple"
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="Choisir un ou plusieurs formateurs…"
                          listHeight={240}
                          maxTagCount="responsive"
                          value={row.formateurs}
                          options={formateurOptions}
                          onChange={(names: string[]) => patchRow(row.key, { formateurs: names })}
                        />
                      </label>
                      <label className="gcert-attestation-field">
                        <Text type="secondary">Date</Text>
                        <DatePicker
                          style={{ width: '100%' }}
                          format="DD/MM/YYYY"
                          value={row.dateDebut}
                          onChange={(date) => patchRow(row.key, { dateDebut: date })}
                        />
                      </label>
                      {type === 'ANIMATION' && (
                        <>
                          <label className="gcert-attestation-field">
                            <Text type="secondary">Nb. d&apos;heures</Text>
                            <Input
                              value={row.heures}
                              onChange={(e) => patchRow(row.key, { heures: e.target.value })}
                              placeholder="21"
                              suffix="h"
                            />
                          </label>
                          <label className="gcert-attestation-field">
                            <Text type="secondary">Public cible</Text>
                            <Input
                              value={row.publicCible}
                              onChange={(e) => patchRow(row.key, { publicCible: e.target.value })}
                              placeholder="Enseignants"
                            />
                          </label>
                          <label className="gcert-attestation-field gcert-attestation-field-wide">
                            <Text type="secondary">Objectifs</Text>
                            <Input.TextArea
                              autoSize={{ minRows: 2, maxRows: 4 }}
                              value={row.objectifs}
                              onChange={(e) => patchRow(row.key, { objectifs: e.target.value })}
                              placeholder="Objectifs de la formation"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <Button block icon={<PlusOutlined />} onClick={() => setRows((p) => [...p, newRow()])}>
                  Ajouter une formation
                </Button>
              </Space>
            )}
          </section>

          <Divider style={{ margin: '4px 0' }} />
          <Text type="secondary" className="gcert-attestation-hint">
            Le PDF reprend le texte des modèles : paragraphe signé par Mme. Hajer BERHOUMA, tableau,
            formule « Cette attestation est délivrée pour servir et valoir ce que de droit. », « Fait
            à Tunis, le … » et zone de signature.
          </Text>
        </div>

        {/* ── Colonne aperçu : rendu du document ──────────────────────────── */}
        <div className="gcert-attestation-preview">
          <div className="gcert-attestation-preview-head">
            <Text strong>Aperçu du document</Text>
            <Tag color={ready ? 'green' : 'default'}>{ready ? 'À jour' : 'En attente'}</Tag>
          </div>
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Aperçu de l'attestation" className="gcert-attestation-iframe" />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Sélectionnez un enseignant puis au moins une formation pour afficher l'attestation."
            />
          )}
        </div>
      </div>
    </Drawer>
  );
}
