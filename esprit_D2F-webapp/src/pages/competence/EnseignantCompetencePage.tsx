import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  Form,
  Select,
  Tag,
  Space,
  Typography,
  Popconfirm,
  Tooltip,
  Statistic,
  Card,
  Row,
  Col,
  Divider,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/auth/useAuth";
import { useEnseignantCompetenceApi, useCompetenceDomaineApi, useSavoirApi, useStructureApi } from "@/hooks/competence/useCompetenceService";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader } from "@/components/common";
import { NIVEAU_OPTIONS } from "@/utils/constants/competenceOptions";
import "@/styles/pages/competence-page.css";
import type { Id } from "@/models/common";
import type { TableColumnsType } from "antd";

interface EnseignantCompetenceRecord {
  id?: Id;
  domaineNom?: string;
  competenceNom?: string;
  sousCompetenceNom?: string;
  savoirNom?: string;
  savoirCode?: string;
  niveau?: string;
  dateAcquisition?: string;
  commentaire?: string;
}

interface SavoirRef {
  id?: Id;
  code?: string;
  nom?: string;
  sousCompetenceNom?: string;
}

interface DomaineRef {
  id?: Id;
  nom?: string;
}

const { Text } = Typography;
const { Option } = Select;

function niveauTag(niveau: string | undefined) {
  const found = NIVEAU_OPTIONS.find((n) => n.value === niveau);
  return found ? (
    <Tag color={found.color}>{found.label}</Tag>
  ) : (
    <Tag>{niveau}</Tag>
  );
}

export default function EnseignantCompetencePage() {
  const { enseignantId: paramId } = useParams();
  const { user } = useAuth();

  // Resolve the enseignant to display: URL param (admin) or current user
  const enseignantId = paramId || user?.username;

  const ecApi = useEnseignantCompetenceApi();
  const domaineApi = useCompetenceDomaineApi();
  const savoirApi = useSavoirApi();
  const structureApi = useStructureApi();
  const { message: msgApi } = useAppNotification();

  const [competences, setCompetences] = useState<EnseignantCompetenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  // Assign modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm] = Form.useForm();
  const [savoirs, setSavoirs] = useState<SavoirRef[]>([]);
  const [savoirsLoading, setSavoirsLoading] = useState(false);

  // Edit niveau modal
  const [niveauModal, setNiveauModal] = useState(false);
  const [niveauForm] = Form.useForm();
  const [editingRecord, setEditingRecord] = useState<EnseignantCompetenceRecord | null>(null);

  // Filters
  const [domaines, setDomaines] = useState<DomaineRef[]>([]);
  const [filterDomaine, setFilterDomaine] = useState<Id | null>(null);
  const [filterNiveau, setFilterNiveau] = useState<string | null>(null);

  // ─── Data loading ─────────────────────────────────────────────────────────
  const loadCompetences = useCallback(async () => {
    if (!enseignantId) return;
    setLoading(true);
    try {
      let data;
      if (filterDomaine) {
        data = await ecApi.getByEnseignantAndDomaine(
          enseignantId,
          filterDomaine
        );
      } else if (filterNiveau) {
        data = await ecApi.getByEnseignantAndNiveau(
          enseignantId,
          filterNiveau
        );
      } else {
        data = await ecApi.getByEnseignant(enseignantId);
      }
      setCompetences(data as EnseignantCompetenceRecord[]);
    } catch {
      msgApi.error("Erreur lors du chargement des compétences");
    } finally {
      setLoading(false);
    }
  }, [enseignantId, filterDomaine, filterNiveau, msgApi]);

  const loadCount = useCallback(async () => {
    if (!enseignantId) return;
    try {
      const res = await ecApi.countByEnseignant(enseignantId) as { count?: number };
      setCount(res.count ?? 0);
    } catch {
      // silent
    }
  }, [enseignantId]);

  const loadDomaines = useCallback(async () => {
    try {
      const data = await domaineApi.getActifs();
      setDomaines(data as DomaineRef[]);
    } catch {
      // silent
    }
  }, []);

  const loadSavoirs = useCallback(async () => {
    setSavoirsLoading(true);
    try {
      const data = await savoirApi.getAll();
      setSavoirs(data as SavoirRef[]);
    } catch {
      msgApi.error("Erreur lors du chargement des savoirs");
    } finally {
      setSavoirsLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    loadCompetences();
    loadCount();
    loadDomaines();
  }, [loadCompetences, loadCount, loadDomaines]);

  // ─── Assign ───────────────────────────────────────────────────────────────
  const openAssignModal = async () => {
    await loadSavoirs();
    assignForm.resetFields();
    setAssignModal(true);
  };

  const handleAssign = async () => {
    try {
      const values = await assignForm.validateFields();
      await ecApi.assign({
        enseignantId,
        ...values,
      });
      msgApi.success("Compétence ajoutée avec succès");
      setAssignModal(false);
      loadCompetences();
      loadCount();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      const msg = e.response?.data?.message || "Erreur lors de l'ajout";
      msgApi.error(msg);
    }
  };

  // ─── Update niveau ────────────────────────────────────────────────────────
  const openNiveauModal = (record: EnseignantCompetenceRecord) => {
    setEditingRecord(record);
    niveauForm.setFieldsValue({ niveau: record.niveau });
    setNiveauModal(true);
  };

  const handleUpdateNiveau = async () => {
    try {
      const { niveau } = await niveauForm.validateFields();
      await ecApi.updateNiveau(editingRecord?.id!, niveau);
      msgApi.success("Niveau mis à jour");
      setNiveauModal(false);
      loadCompetences();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      const msg = e.response?.data?.message || "Erreur lors de la mise à jour";
      msgApi.error(msg);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: Id) => {
    try {
      await ecApi.remove(id);
      msgApi.success("Compétence retirée");
      loadCompetences();
      loadCount();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns: TableColumnsType<EnseignantCompetenceRecord> = [
    {
      title: "Domaine",
      dataIndex: "domaineNom",
      key: "domaineNom",
      sorter: (a, b) => (a.domaineNom || "").localeCompare(b.domaineNom || ""),
    },
    {
      title: "Compétence",
      dataIndex: "competenceNom",
      key: "competenceNom",
      sorter: (a, b) => (a.competenceNom || "").localeCompare(b.competenceNom || ""),
    },
    {
      title: "Sous-Compétence",
      dataIndex: "sousCompetenceNom",
      key: "sousCompetenceNom",
    },
    {
      title: "Savoir",
      dataIndex: "savoirNom",
      key: "savoirNom",
      render: (nom: string, record) => (
        <>
          <Text strong>{nom}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.savoirCode}
          </Text>
        </>
      ),
    },
    {
      title: "Niveau",
      dataIndex: "niveau",
      key: "niveau",
      render: (niveau: string) => niveauTag(niveau),
      filters: NIVEAU_OPTIONS.map((n) => ({ text: n.label, value: n.value })),
      onFilter: (v, r) => r.niveau === v,
    },
    {
      title: "Date Acquisition",
      dataIndex: "dateAcquisition",
      key: "dateAcquisition",
      render: (d: string | undefined) => d || "—",
      sorter: (a, b) => (a.dateAcquisition || "").localeCompare(b.dateAcquisition || ""),
    },
    {
      title: "Commentaire",
      dataIndex: "commentaire",
      key: "commentaire",
      ellipsis: true,
      render: (c: string | undefined) => c || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="Modifier le niveau">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openNiveauModal(record)}
            />
          </Tooltip>
          <Tooltip title="Retirer">
            <Popconfirm
              title="Retirer cette compétence ?"
              okText="Oui"
              cancelText="Non"
              onConfirm={() => record.id != null && handleDelete(record.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <AppPageHeader
        icon={<TrophyOutlined />}
        title={paramId ? `Compétences de l'enseignant ${paramId}` : "Mes Compétences"}
          subtitle="Consulter, ajouter et mettre à jour les compétences maîtrisées"
        />

        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Card>
              <Statistic title="Total compétences" value={count} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="Filtrer par domaine"
            allowClear
            style={{ width: 220 }}
            value={filterDomaine}
            onChange={(v) => { setFilterDomaine(v); setFilterNiveau(null); }}
            showSearch
            optionFilterProp="children"
          >
            {domaines.map((d) => (
              <Option key={d.id} value={d.id}>{d.nom}</Option>
            ))}
          </Select>

          <Select
            placeholder="Filtrer par niveau"
            allowClear
            style={{ width: 200 }}
            value={filterNiveau}
            onChange={(v) => { setFilterNiveau(v); setFilterDomaine(null); }}
          >
            {NIVEAU_OPTIONS.map((n) => (
              <Option key={n.value} value={n.value}>{n.label}</Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAssignModal}
            disabled={!enseignantId}
          >
            Ajouter une compétence
          </Button>
        </Space>

        <Divider />

        <Table
          dataSource={competences}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />

        {/* Assign modal */}
        <Modal
          title="Ajouter une compétence"
          open={assignModal}
          onOk={handleAssign}
          onCancel={() => setAssignModal(false)}
          afterClose={() => assignForm.resetFields()}
          okText="Ajouter"
          cancelText="Annuler"
          forceRender
        >
          <Form form={assignForm} layout="vertical">
            <Form.Item
              name="savoirId"
              label="Savoir"
              rules={[{ required: true, message: "Savoir obligatoire" }]}
            >
              <Select
                placeholder="Sélectionner un savoir"
                loading={savoirsLoading}
                showSearch
                optionFilterProp="children"
              >
                {savoirs.map((s) => (
                  <Option key={s.id} value={s.id}>
                    [{s.code}] {s.nom} – {s.sousCompetenceNom}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="niveau"
              label="Niveau de maîtrise"
              rules={[{ required: true, message: "Niveau obligatoire" }]}
            >
              <Select placeholder="Sélectionner un niveau">
                {NIVEAU_OPTIONS.map((n) => (
                  <Option key={n.value} value={n.value}>{n.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dateAcquisition" label="Date d'acquisition (optionnel)">
              <input type="date" style={{ width: "100%", padding: "4px 8px", border: "1px solid #d9d9d9", borderRadius: 6 }} />
            </Form.Item>

            <Form.Item name="commentaire" label="Commentaire (optionnel)">
              <input
                type="text"
                style={{ width: "100%", padding: "4px 8px", border: "1px solid #d9d9d9", borderRadius: 6 }}
                placeholder="Commentaire libre"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit niveau modal */}
        <Modal
          title="Modifier le niveau de maîtrise"
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
              rules={[{ required: true, message: "Niveau obligatoire" }]}
            >
              <Select>
                {NIVEAU_OPTIONS.map((n) => (
                  <Option key={n.value} value={n.value}>{n.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
    </div>
  );
}






