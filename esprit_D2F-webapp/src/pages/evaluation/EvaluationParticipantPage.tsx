import { useState, useMemo } from 'react';
import type { TableColumnType } from 'antd';
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UserOutlined,
  FilterOutlined,
  ReloadOutlined,
  StarFilled,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { AppPageHeader, EmptyState } from '@/components/common';
import '@/styles/pages/evaluation-globale-page.css';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useEvaluationsParticipants,
  useCreateEvaluationParticipant,
  useUpdateEvaluationParticipant,
  useDeleteEvaluationParticipant,
  useValiderCompetences,
} from '@/hooks/evaluation/useEvaluations';
import { useAllFormations } from '@/hooks/formation/useFormations';
import { useEnseignants } from '@/hooks/enseignant';
import { useHasPermission } from '@/routes/guards';

const { Option } = Select;
const { TextArea } = Input;

interface ParticipantRecord {
  idEvalParticipant?: number;
  enseignantId?: string;
  formationId?: number;
  note?: number;
  satisfaisant?: boolean;
  commentaire?: string;
  [key: string]: unknown;
}

interface FormationRecord {
  idFormation: number;
  titreFormation: string;
}

interface EnseignantRecord {
  id?: string | number;
  nom?: string;
  prenom?: string;
  mail?: string;
}

export default function EvaluationParticipantPage() {
  const { message: msgApi } = useAppNotification();
  const { data: evaluationsData = [], isLoading: loading } = useEvaluationsParticipants();
  const { data: formationsData = [] } = useAllFormations();
  const { data: enseignantsData = [] } = useEnseignants();
  const createMut = useCreateEvaluationParticipant();
  const updateMut = useUpdateEvaluationParticipant();
  const deleteMut = useDeleteEvaluationParticipant();
  const validerMut = useValiderCompetences();

  const evaluations = evaluationsData as ParticipantRecord[];
  const formations = formationsData as FormationRecord[];
  const enseignants = enseignantsData as EnseignantRecord[];

  const canCreate = useHasPermission('EVALUATION', 'CREATE');
  const canEdit = useHasPermission('EVALUATION', 'UPDATE');
  const canDelete = useHasPermission('EVALUATION', 'DELETE');

  const [openForm, setOpenForm] = useState(false);
  const [editingEval, setEditingEval] = useState<ParticipantRecord | null>(null);
  const [form] = Form.useForm();

  const [filterText, setFilterText] = useState('');
  const [formationFilter, setFormationFilter] = useState<number | undefined>();

  function getFormationTitre(formationId: unknown) {
    const f = formations.find((f) => f.idFormation === formationId);
    return f ? f.titreFormation : `Formation #${formationId}`;
  }

  function getEnseignantLabel(enseignantId?: string) {
    if (!enseignantId) return '—';
    const e = enseignants.find((ens) => String(ens.id) === String(enseignantId));
    if (!e) return `Enseignant #${enseignantId}`;
    return `${e.prenom || ''} ${e.nom || ''}`.trim() || String(e.id);
  }

  const filtered = useMemo(() => {
    let res = [...evaluations];
    if (filterText) {
      res = res.filter(
        (e) =>
          getFormationTitre(e.formationId).toLowerCase().includes(filterText.toLowerCase()) ||
          getEnseignantLabel(e.enseignantId).toLowerCase().includes(filterText.toLowerCase()) ||
          String(e.commentaire || '')
            .toLowerCase()
            .includes(filterText.toLowerCase()),
      );
    }
    if (formationFilter) res = res.filter((e) => e.formationId === formationFilter);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, filterText, formationFilter, formations]);

  function openCreate() {
    setEditingEval(null);
    form.resetFields();
    setOpenForm(true);
  }

  function openEdit(record: ParticipantRecord) {
    setEditingEval(record);
    form.setFieldsValue({
      formationId: record.formationId,
      enseignantId: record.enseignantId,
      note: record.note,
      satisfaisant: record.satisfaisant,
      commentaire: record.commentaire,
    });
    setOpenForm(true);
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      if (editingEval) {
        await updateMut.mutateAsync({ id: editingEval.idEvalParticipant as number, data: values });
        msgApi.success('Évaluation participant mise à jour !');
      } else {
        await createMut.mutateAsync(values);
        msgApi.success('Évaluation participant créée !');
      }
      setOpenForm(false);
    } catch (err: unknown) {
      const e = err as {
        errorFields?: unknown;
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      if (e.errorFields) return;
      msgApi.error(`Erreur : ${e.response?.data?.message ?? e.response?.data?.error ?? e.message}`);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMut.mutateAsync(id);
      msgApi.success('Évaluation supprimée');
    } catch {
      msgApi.error('Erreur suppression');
    }
  }

  async function handleValiderCompetences(id: number) {
    try {
      await validerMut.mutateAsync(id);
      msgApi.success('Compétences validées !');
    } catch {
      msgApi.error('Erreur validation compétences');
    }
  }

  function resetFilters() {
    setFilterText('');
    setFormationFilter(undefined);
  }

  const hasActiveFilters = !!(filterText || formationFilter);

  const avgNote =
    evaluations.length > 0
      ? (evaluations.reduce((s, e) => s + (Number(e.note) || 0), 0) / evaluations.length).toFixed(1)
      : '—';
  const satisfiedCount = evaluations.filter((e) => e.satisfaisant).length;
  const notSatisfiedCount = evaluations.filter((e) => e.satisfaisant === false).length;

  const columns: TableColumnType<ParticipantRecord>[] = [
    {
      title: 'Formation',
      dataIndex: 'formationId',
      key: 'formationId',
      width: 220,
      render: (id) => <div className="evaluation-col-title">{getFormationTitre(id)}</div>,
      sorter: (a, b) =>
        (getFormationTitre(a.formationId) || '').localeCompare(
          getFormationTitre(b.formationId) || '',
        ),
    },
    {
      title: 'Enseignant',
      dataIndex: 'enseignantId',
      key: 'enseignantId',
      width: 200,
      render: (id) => (
        <span>
          <UserOutlined className="mr-4" style={{ color: '#a0aec0' }} />
          {getEnseignantLabel(id)}
        </span>
      ),
      sorter: (a, b) =>
        getEnseignantLabel(a.enseignantId).localeCompare(getEnseignantLabel(b.enseignantId)),
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      width: 100,
      align: 'center',
      render: (n) => {
        if (n == null) return '—';
        let color = '#dc2626';
        if (n >= 16) color = '#059669';
        else if (n >= 10) color = '#2563eb';
        else if (n >= 5) color = '#d97706';
        let bg = '#fef2f2';
        if (n >= 16) bg = '#ecfdf5';
        else if (n >= 10) bg = '#eff6ff';
        else if (n >= 5) bg = '#fffbeb';
        return (
          <Tag
            className="rounded-8 fw-700 text-sm"
            style={{ color, background: bg, borderColor: color }}
          >
            <StarFilled className="mr-4 text-xs" />
            {n}/20
          </Tag>
        );
      },
      sorter: (a, b) => (Number(a.note) || 0) - (Number(b.note) || 0),
    },
    {
      title: 'Satisfaisant',
      dataIndex: 'satisfaisant',
      key: 'satisfaisant',
      width: 120,
      align: 'center',
      render: (s) =>
        s ? (
          <Tag color="success" style={{ borderRadius: 8, fontWeight: 600 }}>
            <CheckCircleOutlined className="mr-4" />
            Oui
          </Tag>
        ) : (
          <Tag color="error" style={{ borderRadius: 8, fontWeight: 600 }}>
            Non
          </Tag>
        ),
      sorter: (a, b) => (a.satisfaisant ? 1 : 0) - (b.satisfaisant ? 1 : 0),
    },
    {
      title: 'Commentaire',
      dataIndex: 'commentaire',
      key: 'commentaire',
      ellipsis: true,
      render: (c) => c || '—',
    },
    ...(canEdit || canDelete
      ? [
          {
            title: 'Actions',
            key: 'actions',
            width: 140,
            align: 'center' as const,
            render: (_: unknown, r: ParticipantRecord) => (
              <Space size={4}>
                {canEdit && (
                  <Button
                    type="text"
                    shape="circle"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(r)}
                    className="evaluation-btn-edit"
                  />
                )}
                {canEdit && (
                  <Button
                    type="text"
                    shape="circle"
                    icon={<SafetyCertificateOutlined />}
                    title="Valider compétences"
                    onClick={() => handleValiderCompetences(r.idEvalParticipant!)}
                    style={{ color: '#059669', background: '#ecfdf5' }}
                  />
                )}
                {canDelete && (
                  <Popconfirm
                    title="Supprimer cette évaluation ?"
                    onConfirm={() => handleDelete(r.idEvalParticipant!)}
                  >
                    <Button
                      type="text"
                      shape="circle"
                      icon={<DeleteOutlined />}
                      danger
                      className="evaluation-btn-delete"
                    />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="evaluation-page">
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Évaluations des Participants"
        subtitle={`${filtered.length} évaluation${filtered.length === 1 ? '' : 's'}${hasActiveFilters ? ' (filtrées)' : ''}`}
        actions={
          canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              className="evaluation-btn-add"
            >
              Ajouter une évaluation
            </Button>
          ) : undefined
        }
      />

      {/* ── Statistiques ── */}
      <Row gutter={16} className="evaluation-stats-row">
        <Col xs={24} sm={8}>
          <Card className="evaluation-stat-card">
            <Statistic
              title="Note moyenne"
              value={avgNote}
              suffix="/20"
              valueStyle={{ color: '#b51200', fontWeight: 700 }}
              prefix={<StarFilled />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="evaluation-stat-card">
            <Statistic
              title="Satisfaisants"
              value={satisfiedCount}
              suffix={`/ ${evaluations.length}`}
              valueStyle={{ color: '#059669', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="evaluation-stat-card">
            <Statistic
              title="Non satisfaisants"
              value={notSatisfiedCount}
              suffix={`/ ${evaluations.length}`}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Barre de filtres ── */}
      <div className="evaluation-filter-bar">
        <div className="evaluation-filter-header">
          <div className="evaluation-filter-title">
            <FilterOutlined />
            Filtres
            {hasActiveFilters && <span className="evaluation-filter-active-dot" />}
          </div>
          {hasActiveFilters && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={resetFilters}
              className="text-sm"
            >
              Réinitialiser
            </Button>
          )}
        </div>
        <div className="evaluation-filter-row">
          <Input.Search
            placeholder="Rechercher par formation, enseignant ou commentaire..."
            allowClear
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onSearch={setFilterText}
            style={{ width: 300 }}
          />
          <Select
            placeholder="Formation"
            allowClear
            value={formationFilter}
            onChange={setFormationFilter}
            style={{ width: 220 }}
            showSearch
            optionFilterProp="children"
          >
            {formations.map((f) => (
              <Option key={f.idFormation} value={f.idFormation}>
                {f.titreFormation}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="evaluation-table-wrapper">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="idEvalParticipant"
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} évaluation${total === 1 ? '' : 's'}`,
          }}
          locale={{
            emptyText: (
              <EmptyState
                icon={<SafetyCertificateOutlined />}
                title="Aucune évaluation participant trouvée"
                description={
                  hasActiveFilters
                    ? 'Aucun résultat ne correspond aux filtres.'
                    : 'Aucune évaluation participant enregistrée.'
                }
                action={
                  hasActiveFilters
                    ? { label: 'Effacer les filtres', onClick: resetFilters }
                    : undefined
                }
                compact
              />
            ),
          }}
        />
      </div>

      <Drawer
        title={
          editingEval ? "Modifier l'Évaluation Participant" : 'Nouvelle Évaluation Participant'
        }
        placement="right"
        width={600}
        onClose={() => setOpenForm(false)}
        open={openForm}
        className="evaluation-drawer"
        extra={
          <Button type="primary" onClick={handleSubmit} className="evaluation-btn-submit">
            {editingEval ? 'Mettre à jour' : 'Créer'}
          </Button>
        }
      >
        <Form form={form} layout="vertical" className="evaluation-drawer-form">
          <Form.Item
            name="formationId"
            label="Formation"
            rules={[{ required: true, message: 'Formation obligatoire' }]}
          >
            <Select
              placeholder="Sélectionner une formation"
              showSearch
              optionFilterProp="children"
              disabled={!!editingEval}
            >
              {formations.map((f) => (
                <Option key={f.idFormation} value={f.idFormation}>
                  {f.titreFormation}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="enseignantId"
            label="Enseignant"
            rules={[{ required: true, message: 'Enseignant obligatoire' }]}
          >
            <Select
              placeholder="Sélectionner l'enseignant"
              showSearch
              optionFilterProp="children"
              disabled={!!editingEval}
            >
              {enseignants.map((e) => (
                <Option key={e.id} value={String(e.id)}>
                  {`${e.prenom || ''} ${e.nom || ''}`.trim() || String(e.id)}
                  {e.mail ? ` (${e.mail})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="note"
            label="Note (/20)"
            rules={[{ required: true, message: 'Note obligatoire' }]}
          >
            <InputNumber min={0} max={20} step={0.5} className="w-full" />
          </Form.Item>
          <Form.Item name="satisfaisant" label="Satisfaisant" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
          <Form.Item
            name="commentaire"
            label="Commentaire"
            rules={[{ max: 500, message: 'Max 500 caractères' }]}
          >
            <TextArea rows={3} placeholder="Commentaire sur l'évaluation du participant" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
