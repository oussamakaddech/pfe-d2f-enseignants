// Tableau des affectations enseignants ↔ savoirs (résultat de l'analyse RICE)

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Empty, Modal, Form, Select, Row, Col, Statistic } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  RobotOutlined,
  FileExcelOutlined,
  PlusOutlined,
  TeamOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useEnseignantCompetenceApi, useSavoirApi } from '@/hooks/competence/useCompetenceService';
import { useEnseignants } from '@/hooks/enseignant/useEnseignants';
import AppPageHeader from '@/components/common/AppPageHeader';
import '@/styles/pages/affectation-enseignant-page.css';
import useAppNotification from '@/hooks/ui/useAppNotification';
import { writeExcel, exportDateLabel, isoDate } from '@/utils/helpers/excelExport';
import { useHasPermission } from '@/routes/guards';
import { NIVEAU_OPTIONS } from '@/utils/constants/competenceOptions';
import type { EnseignantCompetence, PerimetreAffectation, Savoir } from '@/models/competence';
import type { AffectationPerimetre } from '@/models/competence';
import type { Id } from '@/models/common';
import {
  NIVEAU_LABEL,
  toNiveauEnum,
  type AffectationSavoirRow,
  type EnseignantRow,
  buildMainColumns,
  buildExpandedColumns,
} from './components/affectationColumns';
import {
  PERIMETRE_OPTIONS,
  buildGroupeeRequest,
  groupeeResultMessage,
  savoirsOfPerimetre,
  type GroupeeFormValues,
} from './components/affectationGroupee';
import {
  allowedEnseignantIds,
  filterByAllowedIds,
  isPerimetreVide,
  perimetreLabel,
} from './components/affectationPerimetre';
import { useMatchingReferential } from './hooks/useMatchingReferential';

const { Option } = Select;

const PERIMETRE_AIDE: Record<PerimetreAffectation, string> = {
  competence:
    'Tous les savoirs de la compétence sont affectés, y compris ceux portés par ses sous-compétences.',
  sousCompetence: 'Les savoirs de la sous-compétence et de toutes ses descendantes sont affectés.',
  savoir: 'Un seul savoir est affecté.',
};

const PERIMETRE_PLACEHOLDER: Record<PerimetreAffectation, string> = {
  competence: 'Sélectionner une compétence',
  sousCompetence: 'Sélectionner une sous-compétence',
  savoir: 'Sélectionner un savoir',
};

export default function AffectationEnseignantPage() {
  const { message: msgApi } = useAppNotification();
  const navigate = useNavigate();
  const canCreate = useHasPermission('AFFECTATION', 'CREATE');
  const canEdit = useHasPermission('AFFECTATION', 'UPDATE_ALL');
  const canDelete = useHasPermission('AFFECTATION', 'DELETE');

  const ecApi = useEnseignantCompetenceApi();
  const savoirApi = useSavoirApi();
  const { data: enseignants = [] } = useEnseignants();
  // Référentiel pour proposer l'affectation par compétence / sous-compétence.
  const { competences, sousCompetences } = useMatchingReferential();

  const [affectations, setAffectations] = useState<EnseignantCompetence[]>([]);
  const [perimetreAffectation, setPerimetreAffectation] = useState<AffectationPerimetre | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [savoirs, setSavoirs] = useState<Savoir[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [niveauModal, setNiveauModal] = useState(false);
  const [perimetre, setPerimetre] = useState<PerimetreAffectation>('competence');
  const [assignForm] = Form.useForm<GroupeeFormValues>();
  const [niveauForm] = Form.useForm<{ niveau: string }>();
  const [editingRecord, setEditingRecord] = useState<AffectationSavoirRow | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [affResult, savResult, perimResult] = await Promise.allSettled([
        ecApi.getAll(),
        savoirApi.getAll(),
        // Périmètre d'écriture résolu par le serveur (ADMIN global, CUP = UP,
        // chef = département) : sert à filtrer l'affichage, pas à décider.
        ecApi.getPerimetre(),
      ]);
      if (affResult.status === 'fulfilled')
        setAffectations(Array.isArray(affResult.value) ? affResult.value : []);
      else {
        msgApi.warning('Impossible de charger les affectations');
        setAffectations([]);
      }
      if (savResult.status === 'fulfilled')
        setSavoirs(Array.isArray(savResult.value) ? savResult.value : []);
      else setSavoirs([]);
      setPerimetreAffectation(perimResult.status === 'fulfilled' ? perimResult.value : null);
    } catch {
      msgApi.error('Erreur inattendue lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [msgApi, ecApi, savoirApi]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const ensMap = useMemo(() => {
    const m = new Map<string, (typeof enseignants)[0]>();
    enseignants.forEach((e) => m.set(String(e.id), e));
    return m;
  }, [enseignants]);

  const savoirMap = useMemo(() => {
    const m = new Map<string, Savoir>();
    savoirs.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [savoirs]);

  /** Identifiants autorisés (`null` = aucun filtrage : administrateur). */
  const perimetreAutorise = useMemo<Set<string> | null>(
    () => allowedEnseignantIds(perimetreAffectation),
    [perimetreAffectation],
  );

  /** Périmètre restreint mais vide : aucune affectation possible. */
  const perimetreVide = useMemo(
    () => isPerimetreVide(perimetreAffectation),
    [perimetreAffectation],
  );

  /** Libellé « l'UP UP_GC et le département DEPT_GC » (null pour un admin). */
  const perimetreTexte = useMemo(
    () => perimetreLabel(perimetreAffectation),
    [perimetreAffectation],
  );

  /** Enseignants proposés dans la fenêtre d'affectation (périmètre seulement). */
  const enseignantsProposables = useMemo(
    () => filterByAllowedIds(enseignants, perimetreAutorise, (e) => e.id),
    [enseignants, perimetreAutorise],
  );

  /** Affectations visibles : celles des enseignants du périmètre. */
  const affectationsVisibles = useMemo(
    () => filterByAllowedIds(affectations, perimetreAutorise, (a) => a.enseignantId),
    [affectations, perimetreAutorise],
  );

  const competenceOptions = useMemo(
    () =>
      (competences ?? [])
        .filter((c) => c.id !== undefined && c.id !== null)
        .map((c) => ({
          value: String(c.id),
          label: `[${c.code ?? '—'}] ${c.nom ?? c.nomCompetence ?? String(c.id)}`,
        })),
    [competences],
  );

  const sousCompetenceOptions = useMemo(() => {
    const compById = new Map<string, string>();
    (competences ?? []).forEach((c) => {
      if (c.id !== undefined && c.id !== null)
        compById.set(String(c.id), String(c.nom ?? c.nomCompetence ?? c.code ?? c.id));
    });
    return (sousCompetences ?? [])
      .filter((sc) => sc.id !== undefined && sc.id !== null)
      .map((sc) => {
        const parent = compById.get(String(sc.competenceId ?? ''));
        const label = `[${sc.code ?? '—'}] ${sc.nom ?? String(sc.id)}`;
        return { value: String(sc.id), label: parent ? `${label} — ${parent}` : label };
      });
  }, [sousCompetences, competences]);

  const selectedCompetenceId = Form.useWatch('competenceId', assignForm) as Id | undefined;
  const selectedSousCompetenceId = Form.useWatch('sousCompetenceId', assignForm) as Id | undefined;
  const selectedSavoirId = Form.useWatch('savoirId', assignForm) as Id | undefined;
  /**
   * Aperçu du nombre de savoirs couverts : calculé seulement si la liste des
   * savoirs est complète (`?size=200`), sinon un total partiel serait trompeur.
   */
  const apercuCouverts = useMemo(() => {
    if (savoirs.length >= 200) return null;
    const id =
      perimetre === 'competence'
        ? selectedCompetenceId
        : perimetre === 'sousCompetence'
          ? selectedSousCompetenceId
          : selectedSavoirId;
    if (id === undefined || id === null || String(id) === '') return null;
    return savoirsOfPerimetre({
      perimetre,
      id,
      savoirs,
      sousCompetences: sousCompetences ?? [],
    }).length;
  }, [
    perimetre,
    selectedCompetenceId,
    selectedSousCompetenceId,
    selectedSavoirId,
    savoirs,
    sousCompetences,
  ]);

  const rows = useMemo<EnseignantRow[]>(() => {
    const grouped = new Map<string, EnseignantRow>();
    affectationsVisibles.forEach((a) => {
      const eid = String(a.enseignantId);
      if (!grouped.has(eid)) {
        const e = ensMap.get(eid);
        grouped.set(eid, {
          key: eid,
          enseignantId: eid,
          nom: e ? `${e.prenom ?? ''} ${e.nom ?? ''}`.trim() : eid.replace(/^EX-/i, ''),
          savoirs: [],
        });
      }
      grouped.get(eid)!.savoirs.push({
        affId: a.id!,
        code: a.savoirCode ?? '—',
        nom: a.savoirNom ?? '—',
        competenceNom: a.competenceNom ?? '—',
        niveau: (() => {
          const affNiveau = toNiveauEnum(a.niveau);
          const savNiveau = toNiveauEnum(savoirMap.get(String(a.savoirId))?.niveau);
          if (!affNiveau) return savNiveau;
          if (affNiveau === 'N1_DEBUTANT' && savNiveau && savNiveau !== affNiveau) return savNiveau;
          return affNiveau;
        })(),
      });
    });
    return Array.from(grouped.values());
  }, [affectationsVisibles, ensMap, savoirMap]);

  const filtered = useMemo<EnseignantRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nom.toLowerCase().includes(q) ||
        r.savoirs.some((s) => s.code.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const exportAffectationsExcel = useCallback(() => {
    // Une ligne par affectation (enseignant ↔ savoir), triée pour rester lisible
    // quand un enseignant porte plusieurs savoirs de plusieurs compétences.
    const exportRows = filtered
      .flatMap((r) =>
        r.savoirs.map((s) => ({
          ENSEIGNANT: r.nom || String(r.enseignantId ?? ''),
          MATRICULE: String(r.enseignantId ?? ''),
          COMPÉTENCE: s.competenceNom,
          'CODE SAVOIR': s.code,
          SAVOIR: s.nom,
          'NIVEAU (CODE)': s.niveau ?? '—',
          NIVEAU: NIVEAU_LABEL[s.niveau ?? ''] ?? s.niveau ?? '—',
        })),
      )
      .sort(
        (a, b) =>
          a.ENSEIGNANT.localeCompare(b.ENSEIGNANT, 'fr') ||
          a.COMPÉTENCE.localeCompare(b.COMPÉTENCE, 'fr') ||
          a['CODE SAVOIR'].localeCompare(b['CODE SAVOIR'], 'fr'),
      );

    const subtitleParts = [
      `${exportRows.length} affectation(s)`,
      `${filtered.length} enseignant(s)`,
    ];
    const scope = perimetreLabel(perimetreAffectation);
    if (scope) subtitleParts.push(`Périmètre : ${scope}`);
    if (search.trim()) subtitleParts.push(`Recherche : « ${search.trim()} »`);
    subtitleParts.push(exportDateLabel());

    writeExcel(
      [
        {
          name: 'AFFECTATIONS',
          rows: exportRows,
          title: 'Affectations enseignants ↔ savoirs',
          subtitle: subtitleParts.join(' · '),
        },
      ],
      `affectations_enseignants_${isoDate()}.xlsx`,
    );
    msgApi.success(`Excel exporté (${exportRows.length} affectation(s))`);
  }, [filtered, perimetreAffectation, search, msgApi]);

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      const request = buildGroupeeRequest(values, perimetre);
      if (!request) {
        msgApi.error('Sélectionnez le périmètre à affecter');
        return;
      }
      const result = await ecApi.assignGroupee(request);
      msgApi.success(groupeeResultMessage(result));
      setAssignModal(false);
      await loadAll();
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Erreur lors de l'ajout";
      msgApi.error(msg);
    }
  };

  const handleUpdateNiveau = async () => {
    try {
      const { niveau } = (await niveauForm.validateFields()) as { niveau: string };
      await ecApi.updateNiveau(editingRecord!.affId, niveau);
      msgApi.success('Niveau mis à jour');
      setNiveauModal(false);
      await loadAll();
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Erreur lors de la mise à jour';
      msgApi.error(msg);
    }
  };

  const handleDeleteSavoir = async (affId: Id) => {
    try {
      await ecApi.remove(affId);
      msgApi.success('Affectation supprimée');
      await loadAll();
    } catch {
      msgApi.error('Erreur lors de la suppression');
    }
  };

  const openNiveauModal = (record: AffectationSavoirRow) => {
    setEditingRecord(record);
    niveauForm.setFieldsValue({ niveau: record.niveau ?? '' });
    setNiveauModal(true);
  };

  const handleDeleteAll = async (rec: EnseignantRow) => {
    try {
      await Promise.all(rec.savoirs.map((s) => ecApi.remove(s.affId)));
      msgApi.success('Affectations supprimées');
      await loadAll();
    } catch {
      msgApi.error('Erreur lors de la suppression');
    }
  };

  const columns = buildMainColumns({
    openNiveauModal,
    handleDeleteSavoir,
    handleDeleteAll,
    canEdit,
    canDelete,
  });

  const expandedRowRender = (record: EnseignantRow) => (
    <Table
      columns={buildExpandedColumns(openNiveauModal, handleDeleteSavoir, canEdit, canDelete)}
      dataSource={record.savoirs}
      pagination={false}
      rowKey={(r) => String(r.affId)}
      size="small"
    />
  );

  const stats = useMemo(
    () => [
      {
        icon: <TeamOutlined />,
        label: 'Enseignants',
        value: rows.length,
        color: 'var(--color-info)',
        bg: 'var(--color-info-bg)',
      },
      {
        icon: <BookOutlined />,
        label: 'Affectations',
        value: affectationsVisibles.length,
        color: 'var(--primary-500)',
        bg: 'var(--primary-50)',
      },
      {
        icon: <SafetyCertificateOutlined />,
        label: 'Savoirs',
        value: savoirs.length,
        color: 'var(--color-success)',
        bg: 'var(--color-success-bg)',
      },
    ],
    [rows.length, affectationsVisibles.length, savoirs.length],
  );

  return (
    <div className="affectation-page">
      <AppPageHeader
        icon={<TeamOutlined />}
        title="Affectations Enseignants"
        subtitle="Résultat de l'analyse RICE : enseignants et leurs savoirs associés. Ajoutez des affectations manuellement."
        actions={
          canCreate ? (
            <Button
              className="d2f-btn-primary"
              icon={<PlusOutlined />}
              disabled={perimetreVide}
              onClick={() => setAssignModal(true)}
            >
              Nouvelle Affectation
            </Button>
          ) : undefined
        }
      />
      {perimetreTexte !== null && (
        <div className="affectation-perimetre-banner" role="status">
          <InfoCircleOutlined className="affectation-perimetre-banner-icon" />
          <span>
            Vous gérez les enseignants de <strong>{perimetreTexte}</strong> : la liste, les
            statistiques et l'export sont limités à ce périmètre, et chaque affectation y est
            contrôlée par le serveur.
          </span>
        </div>
      )}
      {perimetreVide && (
        <div
          className="affectation-perimetre-banner affectation-perimetre-banner--vide"
          role="alert"
        >
          <StopOutlined className="affectation-perimetre-banner-icon" />
          <span>
            Aucun enseignant dans votre périmètre : votre fiche enseignant ne porte ni UP ni
            département, ou aucune fiche n'y est rattachée. Demandez la configuration à un
            administrateur.
          </span>
        </div>
      )}
      <Row gutter={[16, 16]} className="affectation-stats-row">
        {stats.map((s) => (
          <Col xs={12} sm={8} key={s.label}>
            <div className="affectation-stat-card">
              <div className="affectation-stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              <Statistic
                title={s.label}
                value={s.value}
                valueStyle={{ color: s.color, fontWeight: 700 }}
              />
            </div>
          </Col>
        ))}
      </Row>
      <div className="affectation-toolbar">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Rechercher enseignant ou code savoir…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <div style={{ flex: 1 }} />
        <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
          Actualiser
        </Button>
        <Button
          icon={<FileExcelOutlined />}
          onClick={exportAffectationsExcel}
          disabled={loading || filtered.length === 0}
        >
          Export Excel
        </Button>
      </div>
      <div className="affectation-table-wrapper">
        <Table<EnseignantRow>
          dataSource={filtered}
          columns={columns}
          rowKey="enseignantId"
          expandable={{ expandedRowRender, expandRowByClick: false }}
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} enseignant(s)`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    Aucune affectation.{' '}
                    {!perimetreVide && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => navigate('/home/rice')}
                      >
                        <RobotOutlined /> Analyser une fiche RICE
                      </button>
                    )}
                  </span>
                }
              />
            ),
          }}
        />
      </div>
      <Modal
        title="Nouvelle affectation"
        className="affectation-modal"
        open={assignModal}
        onOk={handleAssign}
        onCancel={() => setAssignModal(false)}
        afterClose={() => {
          assignForm.resetFields();
          setPerimetre('competence');
        }}
        okText="Ajouter"
        cancelText="Annuler"
        forceRender
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item
            name="enseignantId"
            label="Enseignant"
            rules={[{ required: true, message: 'Enseignant obligatoire' }]}
          >
            <Select placeholder="Sélectionner un enseignant" showSearch optionFilterProp="children">
              {enseignantsProposables.map((e) => (
                <Option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Affecter par">
            <Select
              value={perimetre}
              onChange={(v: PerimetreAffectation) => {
                setPerimetre(v);
                // Évite de transmettre un périmètre précédent (le serveur donne
                // la priorité à `savoirIds`, puis à la sous-compétence).
                assignForm.setFieldsValue({
                  competenceId: undefined,
                  sousCompetenceId: undefined,
                  savoirId: undefined,
                });
              }}
              options={PERIMETRE_OPTIONS}
            />
          </Form.Item>
          {perimetre === 'competence' && (
            <Form.Item
              name="competenceId"
              label="Compétence"
              rules={[{ required: true, message: 'Compétence obligatoire' }]}
              extra={PERIMETRE_AIDE.competence}
            >
              <Select
                placeholder={PERIMETRE_PLACEHOLDER.competence}
                showSearch
                optionFilterProp="label"
                options={competenceOptions}
              />
            </Form.Item>
          )}
          {perimetre === 'sousCompetence' && (
            <Form.Item
              name="sousCompetenceId"
              label="Sous-compétence"
              rules={[{ required: true, message: 'Sous-compétence obligatoire' }]}
              extra={PERIMETRE_AIDE.sousCompetence}
            >
              <Select
                placeholder={PERIMETRE_PLACEHOLDER.sousCompetence}
                showSearch
                optionFilterProp="label"
                options={sousCompetenceOptions}
              />
            </Form.Item>
          )}
          {perimetre === 'savoir' && (
            <Form.Item
              name="savoirId"
              label="Savoir"
              rules={[{ required: true, message: 'Savoir obligatoire' }]}
              extra={PERIMETRE_AIDE.savoir}
            >
              <Select
                placeholder={PERIMETRE_PLACEHOLDER.savoir}
                showSearch
                optionFilterProp="children"
              >
                {savoirs.map((s) => (
                  <Option key={s.id} value={s.id}>
                    [{s.code}] {s.nom}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          {apercuCouverts !== null && (
            <div className="affectation-perimetre-apercu">
              {apercuCouverts} savoir(s) seront affectés à cet enseignant (les savoirs déjà affectés
              sont conservés tels quels).
            </div>
          )}
          <Form.Item
            name="niveau"
            label="Niveau de maîtrise"
            rules={[{ required: true, message: 'Niveau obligatoire' }]}
            extra="Appliqué aux nouvelles affectations uniquement : les savoirs déjà affectés gardent leur niveau."
          >
            <Select placeholder="Sélectionner un niveau">
              {NIVEAU_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>
                  {n.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateAcquisition" label="Date d'acquisition (optionnel)">
            <Input type="date" placeholder="Sélectionner une date" />
          </Form.Item>
          <Form.Item name="commentaire" label="Commentaire (optionnel)">
            <Input placeholder="Commentaire libre" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Modifier le niveau de maîtrise"
        className="affectation-modal"
        open={niveauModal}
        onOk={handleUpdateNiveau}
        onCancel={() => setNiveauModal(false)}
        afterClose={() => niveauForm.resetFields()}
        okText="Mettre à jour"
        cancelText="Annuler"
        forceRender
      >
        <Form form={niveauForm} layout="vertical">
          <Form.Item
            name="niveau"
            label="Niveau"
            rules={[{ required: true, message: 'Niveau obligatoire' }]}
          >
            <Select>
              {NIVEAU_OPTIONS.map((n) => (
                <Option key={n.value} value={n.value}>
                  {n.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
