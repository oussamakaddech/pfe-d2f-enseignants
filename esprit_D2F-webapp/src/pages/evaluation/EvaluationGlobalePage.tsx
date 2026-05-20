import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  Popconfirm,
  Tag,
  Card,
  Alert,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
  FilterOutlined,
  ReloadOutlined,
  StarFilled,
} from "@ant-design/icons";
import { AppPageHeader, EmptyState } from "@/components/common";
import "@/styles/pages/evaluation-globale-page.css";
import moment from "moment";
import EvaluationGlobaleService from "@/services/evaluation/EvaluationGlobaleService";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Option } = Select;
const { TextArea } = Input;

const RECO_COLORS = {
  EXCELLENTE: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Excellente" },
  A_CONTINUER: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "A continuer" },
  A_AMELIORER: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "A ameliorer" },
  A_ARRETER: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "A arreter" },
};

export default function EvaluationGlobalePage() {
  const [evaluations, setEvaluations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { message: msgApi } = useAppNotification();
  const [openForm, setOpenForm] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [form] = Form.useForm();

  const [filterText, setFilterText] = useState("");
  const [recoFilter, setRecoFilter] = useState();
  const [formationFilter, setFormationFilter] = useState();

  useEffect(() => {
    applyFilters();
  }, [evaluations, filterText, recoFilter, formationFilter]);

  useEffect(() => {
    void loadEvaluations();
    void loadFormations();
  }, []);

  async function loadEvaluations() {
    setLoading(true);
    try {
      const data = await EvaluationGlobaleService.getAllEvaluationGlobales();
      setEvaluations(Array.isArray(data) ? data : []);
      msgApi.success("Évaluations globales chargées !");
    } catch (err) {
      console.error(err);
      msgApi.error("Erreur chargement évaluations");
    } finally {
      setLoading(false);
    }
  }

  async function loadFormations() {
    try {
      const data = await FormationWorkflowService.getAllFormationWorkflows();
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      setFormations(arr);
    } catch (err) {
      console.error(err);
      setFormations([]);
    }
  }

  function openCreate() {
    setEditingEval(null);
    form.resetFields();
    setOpenForm(true);
  }

  function openEdit(record) {
    setEditingEval(record);
    form.setFieldsValue({
      formationId: record.formationId,
      commentaireGeneral: record.commentaireGeneral,
      dateEvaluation: record.dateEvaluation ? moment(record.dateEvaluation) : null,
      noteGlobale: record.noteGlobale,
      recommandation: record.recommandation,
    });
    setOpenForm(true);
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        dateEvaluation: values.dateEvaluation ? values.dateEvaluation.toDate() : null,
      };

      if (editingEval) {
        await EvaluationGlobaleService.updateEvaluationGlobale(
          editingEval.idEvalGlobale,
          payload
        );
        msgApi.success("Évaluation globale mise à jour !");
      } else {
        await EvaluationGlobaleService.createEvaluationGlobale(payload);
        msgApi.success("Évaluation globale créée !");
      }
      setOpenForm(false);
      void loadEvaluations();
    } catch (err) {
      if (err.errorFields) return;
      const apiMsg =
        err.response?.data?.message || err.response?.data?.error || err.message;
      msgApi.error(`Erreur : ${apiMsg}`);
    }
  }

  async function handleDelete(id) {
    try {
      await EvaluationGlobaleService.deleteEvaluationGlobale(id);
      msgApi.success("Évaluation supprimée");
      void loadEvaluations();
    } catch {
      msgApi.error("Erreur suppression");
    }
  }

  function getFormationTitre(formationId) {
    const f = formations.find((f) => f.idFormation === formationId);
    return f ? f.titreFormation : `Formation #${formationId}`;
  }

  function applyFilters() {
    let res = [...evaluations];
    if (filterText) {
      res = res.filter((e) =>
        (getFormationTitre(e.formationId) || "").toLowerCase().includes(filterText.toLowerCase()) ||
        (e.commentaireGeneral || "").toLowerCase().includes(filterText.toLowerCase())
      );
    }
    if (recoFilter) res = res.filter((e) => e.recommandation === recoFilter);
    if (formationFilter) res = res.filter((e) => e.formationId === formationFilter);
    setFiltered(res);
  }

  function resetFilters() {
    setFilterText("");
    setRecoFilter(undefined);
    setFormationFilter(undefined);
  }

  const hasActiveFilters = filterText || recoFilter || formationFilter;

  const avgNote = evaluations.length > 0
    ? (evaluations.reduce((s, e) => s + (e.noteGlobale || 0), 0) / evaluations.length).toFixed(1)
    : "\u2014";
  const excellentCount = evaluations.filter((e) => e.recommandation === "EXCELLENTE").length;
  const toImproveCount = evaluations.filter((e) => e.recommandation === "A_AMELIORER").length;

  const columns = [
    {
      title: "Formation",
      dataIndex: "formationId",
      key: "formationId",
      width: 240,
      render: (id) => (
        <div>
          <div className="evaluation-col-title">{getFormationTitre(id)}</div>
        </div>
      ),
      sorter: (a, b) => (getFormationTitre(a.formationId) || "").localeCompare(getFormationTitre(b.formationId) || ""),
    },
    {
      title: "Note",
      dataIndex: "noteGlobale",
      key: "noteGlobale",
      width: 100,
      align: "center",
      render: (n) => {
        if (n == null) return "\u2014";
        const color = n >= 16 ? "#059669" : n >= 10 ? "#2563eb" : n >= 5 ? "#d97706" : "#dc2626";
        const bg = n >= 16 ? "#ecfdf5" : n >= 10 ? "#eff6ff" : n >= 5 ? "#fffbeb" : "#fef2f2";
        return (
          <Tag style={{ color, background: bg, borderColor: color, borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "2px 10px" }}>
            <StarFilled style={{ marginRight: 4, fontSize: 11 }} />{n}/20
          </Tag>
        );
      },
      sorter: (a, b) => (a.noteGlobale || 0) - (b.noteGlobale || 0),
    },
    {
      title: "Recommandation",
      dataIndex: "recommandation",
      key: "recommandation",
      width: 140,
      render: (r) => {
        if (!r) return "\u2014";
        const c = RECO_COLORS[r] || { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", label: r };
        return <Tag style={{ color: c.color, background: c.bg, borderColor: c.border, borderRadius: 8, fontWeight: 600, fontSize: 12 }}>{c.label}</Tag>;
      },
      sorter: (a, b) => (a.recommandation || "").localeCompare(b.recommandation || ""),
    },
    {
      title: "Commentaire",
      dataIndex: "commentaireGeneral",
      key: "commentaireGeneral",
      ellipsis: true,
      render: (c) => c || "\u2014",
    },
    {
      title: "Date",
      dataIndex: "dateEvaluation",
      key: "dateEvaluation",
      width: 120,
      render: (d) => d ? moment(d).format("DD/MM/YYYY") : "\u2014",
      sorter: (a, b) => moment(a.dateEvaluation) - moment(b.dateEvaluation),
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, r) => (
        <Space size={4}>
          <Button
            type="text"
            shape="circle"
            icon={<EditOutlined />}
            onClick={() => openEdit(r)}
            className="evaluation-btn-edit"
          />
          <Popconfirm
            title="Supprimer cette évaluation ?"
            onConfirm={() => handleDelete(r.idEvalGlobale)}
          >
            <Button
              type="text"
              shape="circle"
              icon={<DeleteOutlined />}
              danger
              className="evaluation-btn-delete"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="evaluation-page">
        <AppPageHeader
          icon={<TrophyOutlined />}
          title="Évaluation Globale des Formations"
          subtitle={`${filtered.length} évaluation${filtered.length !== 1 ? "s" : ""}${hasActiveFilters ? " (filtrées)" : ""}`}
          actions={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              className="evaluation-btn-add"
            >
              Ajouter une évaluation
            </Button>
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
                valueStyle={{ color: "#B51200", fontWeight: 700 }}
                prefix={<StarFilled />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="evaluation-stat-card">
              <Statistic
                title="Excellentes"
                value={excellentCount}
                suffix={`/ ${evaluations.length}`}
                valueStyle={{ color: "#059669", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="evaluation-stat-card">
              <Statistic
                title="À améliorer"
                value={toImproveCount}
                suffix={`/ ${evaluations.length}`}
                valueStyle={{ color: "#d97706", fontWeight: 700 }}
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
              <Button type="link" size="small" icon={<ReloadOutlined />} onClick={resetFilters}
                style={{ fontSize: 12, padding: "0 4px" }}>
                Réinitialiser
              </Button>
            )}
          </div>
          <div className="evaluation-filter-row">
            <Input.Search
              placeholder="Rechercher par formation ou commentaire..."
              allowClear
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              onSearch={setFilterText}
              style={{ width: 280 }}
            />
            <Select placeholder="Recommandation" allowClear value={recoFilter} onChange={setRecoFilter} style={{ width: 160 }}>
              {Object.entries(RECO_COLORS).map(([k, v]) => (
                <Option key={k} value={k}>{v.label}</Option>
              ))}
            </Select>
            <Select placeholder="Formation" allowClear value={formationFilter} onChange={setFormationFilter} style={{ width: 220 }} showSearch optionFilterProp="children">
              {formations.map((f) => (
                <Option key={f.idFormation} value={f.idFormation}>{f.titreFormation}</Option>
              ))}
            </Select>
          </div>
        </div>

        <Alert
          message="Une seule évaluation globale est autorisée par formation."
          type="info"
          showIcon
          className="evaluation-info-alert"
        />

        {/* ── Tableau ── */}
        <div className="evaluation-table-wrapper">
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="idEvalGlobale"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `${total} évaluation${total !== 1 ? "s" : ""}` }}
            locale={{
              emptyText: (
                <EmptyState
                  icon={<TrophyOutlined />}
                  title="Aucune évaluation trouvée"
                  description={hasActiveFilters ? "Aucun résultat ne correspond aux filtres." : "Aucune évaluation enregistrée."}
                  action={hasActiveFilters ? { label: "Effacer les filtres", onClick: resetFilters } : undefined}
                  compact
                />
              ),
            }}
          />
        </div>

        <Drawer
          title={editingEval ? "Modifier l'Évaluation Globale" : "Nouvelle Évaluation Globale"}
          placement="right"
          width={600}
          onClose={() => setOpenForm(false)}
          open={openForm}
          className="evaluation-drawer"
          extra={
            <Button
              type="primary"
              onClick={handleSubmit}
              className="evaluation-btn-submit"
            >
              {editingEval ? "Mettre à jour" : "Créer"}
            </Button>
          }
        >
          <Form form={form} layout="vertical" className="evaluation-drawer-form">
            <Form.Item
              name="formationId"
              label="Formation"
              rules={[{ required: true, message: "Formation obligatoire" }]}
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
            <Form.Item name="noteGlobale" label="Note Globale (/20)">
              <InputNumber min={0} max={20} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="commentaireGeneral" label="Commentaire Général">
              <TextArea rows={4} placeholder="Commentaire général sur la formation" />
            </Form.Item>
            <Form.Item name="dateEvaluation" label="Date d'Évaluation">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="recommandation" label="Recommandation">
              <Select placeholder="Sélectionner une recommandation" allowClear>
                {Object.entries(RECO_COLORS).map(([k, v]) => (
                  <Option key={k} value={k}>{v.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </>
  );
}




