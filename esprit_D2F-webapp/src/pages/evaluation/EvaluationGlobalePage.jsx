import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  message,
  Typography,
  Breadcrumb,
  Tag,
  Card,
  Alert,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import moment from "moment";
import EvaluationGlobaleService from "../../services/EvaluationGlobaleService";
import FormationService from "../../services/FormationService";

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function EvaluationGlobalePage() {
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msgApi, msgCtx] = message.useMessage();
  const [openForm, setOpenForm] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadEvaluations();
    loadFormations();
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
      const data = await FormationService.getAllFormations();
      setFormations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
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
      loadEvaluations();
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
      loadEvaluations();
    } catch {
      msgApi.error("Erreur suppression");
    }
  }

  function getFormationTitre(formationId) {
    const f = formations.find((f) => f.idFormation === formationId);
    return f ? f.titreFormation : `Formation #${formationId}`;
  }

  const columns = [
    {
      title: "Formation",
      dataIndex: "formationId",
      key: "formationId",
      render: (id) => getFormationTitre(id),
      sorter: (a, b) => (getFormationTitre(a.formationId) || "").localeCompare(getFormationTitre(b.formationId) || ""),
    },
    {
      title: "Note Globale",
      dataIndex: "noteGlobale",
      key: "noteGlobale",
      render: (n) => (n != null ? <Tag color={n >= 10 ? "green" : "red"}>{n}/20</Tag> : "_"),
      sorter: (a, b) => (a.noteGlobale || 0) - (b.noteGlobale || 0),
    },
    {
      title: "Commentaire",
      dataIndex: "commentaireGeneral",
      key: "commentaireGeneral",
      ellipsis: true,
    },
    {
      title: "Date Évaluation",
      dataIndex: "dateEvaluation",
      key: "dateEvaluation",
      render: (d) => (d ? moment(d).format("L") : "_"),
      sorter: (a, b) => moment(a.dateEvaluation) - moment(b.dateEvaluation),
    },
    {
      title: "Recommandation",
      dataIndex: "recommandation",
      key: "recommandation",
      render: (r) => r || "_",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm
            title="Supprimer cette évaluation ?"
            onConfirm={() => handleDelete(r.idEvalGlobale)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: "16px 24px" }}>
        <Breadcrumb
          items={[
            {
              title: (
                <>
                  <HomeOutlined /> Accueil
                </>
              ),
              onClick: () => navigate("/home"),
              style: { cursor: "pointer" },
            },
            { title: "Évaluations Globales" },
          ]}
        />
        <Title level={4} style={{ marginTop: 8, marginBottom: 16 }}>
          📊 Évaluation Globale des Formations
        </Title>

        <Alert
          message="Alerte de doublon"
          description="Une seule évaluation globale est autorisée par formation. Si une évaluation existe déjà, une alerte sera affichée."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card variant="outlined">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ marginBottom: 16 }}
          >
            Ajouter une Évaluation Globale
          </Button>
          <Table
            dataSource={evaluations}
            columns={columns}
            rowKey="idEvalGlobale"
            loading={loading}
            pagination={{ pageSize: 8 }}
          />
        </Card>

        <Drawer
          title={editingEval ? "Modifier l'Évaluation Globale" : "Nouvelle Évaluation Globale"}
          placement="right"
          width={600}
          onClose={() => setOpenForm(false)}
          open={openForm}
          extra={
            <Button type="primary" onClick={handleSubmit}>
              {editingEval ? "Mettre à jour" : "Créer"}
            </Button>
          }
        >
          <Form form={form} layout="vertical">
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
                <Option value="A_CONTINUER">À continuer</Option>
                <Option value="A_AMELIORER">À améliorer</Option>
                <Option value="A_ARRETER">À arrêter</Option>
                <Option value="EXCELLENTE">Excellente</Option>
              </Select>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </>
  );
}