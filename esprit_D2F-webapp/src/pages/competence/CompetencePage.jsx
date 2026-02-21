// src/pages/competence/CompetencePage.jsx
import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import CompetenceService from "../../services/CompetenceService";

const { Title } = Typography;
const { Option } = Select;

// ─── Types & niveaux ───────────────────────────────────────────────────────
const TYPE_SAVOIR_OPTIONS = ["THEORIQUE", "PRATIQUE"];

// ─── Generic CRUD Tab component ────────────────────────────────────────────
function CrudTab({ columns, data, loading, onAdd, onEdit, onDelete, addLabel }) {
  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onAdd}
        style={{ marginBottom: 16 }}
      >
        {addLabel}
      </Button>
      <Table
        dataSource={data}
        columns={[
          ...columns,
          {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record) => (
              <Space>
                <Tooltip title="Modifier">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                  />
                </Tooltip>
                <Tooltip title="Supprimer">
                  <Popconfirm
                    title="Confirmer la suppression ?"
                    okText="Oui"
                    cancelText="Non"
                    onConfirm={() => onDelete(record.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );
}

CrudTab.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  addLabel: PropTypes.string.isRequired,
};

CrudTab.defaultProps = {
  loading: false,
};

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CompetencePage() {
  const [msgApi, msgCtx] = message.useMessage();

  // ─ Domaines ─
  const [domaines, setDomaines] = useState([]);
  const [domainesLoading, setDomainesLoading] = useState(false);
  const [domaineModal, setDomaineModal] = useState(false);
  const [editingDomaine, setEditingDomaine] = useState(null);
  const [domaineForm] = Form.useForm();

  // ─ Compétences ─
  const [competences, setCompetences] = useState([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compModal, setCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [compForm] = Form.useForm();

  // ─ Sous-Compétences ─
  const [sousComps, setSousComps] = useState([]);
  const [scLoading, setScLoading] = useState(false);
  const [scModal, setScModal] = useState(false);
  const [editingSc, setEditingSc] = useState(null);
  const [scForm] = Form.useForm();

  // ─ Savoirs ─
  const [savoirs, setSavoirs] = useState([]);
  const [savoirsLoading, setSavoirsLoading] = useState(false);
  const [savoirModal, setSavoirModal] = useState(false);
  const [editingSavoir, setEditingSavoir] = useState(null);
  const [savoirForm] = Form.useForm();

  // ─── Data loading ────────────────────────────────────────────────────────
  const loadDomaines = useCallback(async () => {
    setDomainesLoading(true);
    try {
      const data = await CompetenceService.domaine.getAll();
      setDomaines(data);
    } catch {
      msgApi.error("Erreur lors du chargement des domaines");
    } finally {
      setDomainesLoading(false);
    }
  }, [msgApi]);

  const loadCompetences = useCallback(async () => {
    setCompLoading(true);
    try {
      const data = await CompetenceService.competence.getAll();
      setCompetences(data);
    } catch {
      msgApi.error("Erreur lors du chargement des compétences");
    } finally {
      setCompLoading(false);
    }
  }, [msgApi]);

  const loadSousCompetences = useCallback(async () => {
    setScLoading(true);
    try {
      const data = await CompetenceService.sousCompetence.getAll();
      setSousComps(data);
    } catch {
      msgApi.error("Erreur lors du chargement des sous-compétences");
    } finally {
      setScLoading(false);
    }
  }, [msgApi]);

  const loadSavoirs = useCallback(async () => {
    setSavoirsLoading(true);
    try {
      const data = await CompetenceService.savoir.getAll();
      setSavoirs(data);
    } catch {
      msgApi.error("Erreur lors du chargement des savoirs");
    } finally {
      setSavoirsLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    loadDomaines();
    loadCompetences();
    loadSousCompetences();
    loadSavoirs();
  }, [loadDomaines, loadCompetences, loadSousCompetences, loadSavoirs]);

  // ─── DOMAINES CRUD ───────────────────────────────────────────────────────
  const openDomaineModal = (record = null) => {
    setEditingDomaine(record);
    domaineForm.setFieldsValue(record || { code: "", nom: "", description: "", actif: true });
    setDomaineModal(true);
  };

  const handleDomaineSubmit = async () => {
    try {
      const values = await domaineForm.validateFields();
      if (editingDomaine) {
        await CompetenceService.domaine.update(editingDomaine.id, values);
        msgApi.success("Domaine mis à jour");
      } else {
        await CompetenceService.domaine.create(values);
        msgApi.success("Domaine créé");
      }
      setDomaineModal(false);
      loadDomaines();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleDomaineDelete = async (id) => {
    try {
      await CompetenceService.domaine.delete(id);
      msgApi.success("Domaine supprimé");
      loadDomaines();
      loadCompetences();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const domaineColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100, sorter: (a, b) => a.code.localeCompare(b.code) },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Actif",
      dataIndex: "actif",
      key: "actif",
      width: 80,
      render: (actif, record) => (
        <Switch
          checked={actif}
          size="small"
          onChange={async () => {
            try {
              await CompetenceService.domaine.toggleActif(record.id);
              loadDomaines();
            } catch {
              msgApi.error("Erreur lors du changement de statut");
            }
          }}
        />
      ),
    },
    {
      title: "Compétences",
      key: "nbComp",
      width: 110,
      render: (_, record) => (
        <Tag color="blue">{record.competences?.length ?? 0}</Tag>
      ),
    },
  ];

  // ─── COMPÉTENCES CRUD ────────────────────────────────────────────────────
  const openCompModal = (record = null) => {
    setEditingComp(record);
    compForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, ordre: record.ordre, domaineId: record.domaineId }
        : { code: "", nom: "", description: "", ordre: null, domaineId: null }
    );
    setCompModal(true);
  };

  const handleCompSubmit = async () => {
    try {
      const values = await compForm.validateFields();
      const { domaineId, ...rest } = values;
      if (editingComp) {
        await CompetenceService.competence.update(editingComp.id, rest);
        msgApi.success("Compétence mise à jour");
      } else {
        await CompetenceService.competence.create(domaineId, rest);
        msgApi.success("Compétence créée");
      }
      setCompModal(false);
      loadCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleCompDelete = async (id) => {
    try {
      await CompetenceService.competence.delete(id);
      msgApi.success("Compétence supprimée");
      loadCompetences();
      loadSousCompetences();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const compColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Ordre", dataIndex: "ordre", key: "ordre", width: 70 },
    { title: "Domaine", dataIndex: "domaineNom", key: "domaineNom", filters: domaines.map((d) => ({ text: d.nom, value: d.nom })), onFilter: (v, r) => r.domaineNom === v },
    { title: "Sous-Comp.", key: "nbSc", width: 110, render: (_, r) => <Tag color="geekblue">{r.sousCompetences?.length ?? 0}</Tag> },
  ];

  // ─── SOUS-COMPÉTENCES CRUD ───────────────────────────────────────────────
  const openScModal = (record = null) => {
    setEditingSc(record);
    scForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, competenceId: record.competenceId }
        : { code: "", nom: "", description: "", competenceId: null }
    );
    setScModal(true);
  };

  const handleScSubmit = async () => {
    try {
      const values = await scForm.validateFields();
      const { competenceId, ...rest } = values;
      if (editingSc) {
        await CompetenceService.sousCompetence.update(editingSc.id, rest);
        msgApi.success("Sous-compétence mise à jour");
      } else {
        await CompetenceService.sousCompetence.create(competenceId, rest);
        msgApi.success("Sous-compétence créée");
      }
      setScModal(false);
      loadSousCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleScDelete = async (id) => {
    try {
      await CompetenceService.sousCompetence.delete(id);
      msgApi.success("Sous-compétence supprimée");
      loadSousCompetences();
      loadSavoirs();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const scColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Compétence", dataIndex: "competenceNom", key: "competenceNom", filters: competences.map((c) => ({ text: c.nom, value: c.nom })), onFilter: (v, r) => r.competenceNom === v },
    { title: "Savoirs", key: "nbSav", width: 90, render: (_, r) => <Tag color="cyan">{r.savoirs?.length ?? 0}</Tag> },
  ];

  // ─── SAVOIRS CRUD ─────────────────────────────────────────────────────────
  const openSavoirModal = (record = null) => {
    setEditingSavoir(record);
    savoirForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, type: record.type, sousCompetenceId: record.sousCompetenceId }
        : { code: "", nom: "", description: "", type: null, sousCompetenceId: null }
    );
    setSavoirModal(true);
  };

  const handleSavoirSubmit = async () => {
    try {
      const values = await savoirForm.validateFields();
      const { sousCompetenceId, ...rest } = values;
      if (editingSavoir) {
        await CompetenceService.savoir.update(editingSavoir.id, rest);
        msgApi.success("Savoir mis à jour");
      } else {
        await CompetenceService.savoir.create(sousCompetenceId, rest);
        msgApi.success("Savoir créé");
      }
      setSavoirModal(false);
      loadSavoirs();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleSavoirDelete = async (id) => {
    try {
      await CompetenceService.savoir.delete(id);
      msgApi.success("Savoir supprimé");
      loadSavoirs();
    } catch (err) {      if (err?.errorFields) return;      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const savoirColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type) => (
        <Tag color={type === "THEORIQUE" ? "purple" : "orange"}>{type}</Tag>
      ),
      filters: TYPE_SAVOIR_OPTIONS.map((t) => ({ text: t, value: t })),
      onFilter: (v, r) => r.type === v,
    },
    { title: "Sous-Compétence", dataIndex: "sousCompetenceNom", key: "sousCompetenceNom" },
  ];

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    {
      key: "domaines",
      label: "Domaines",
      children: (
        <CrudTab
          columns={domaineColumns}
          data={domaines}
          loading={domainesLoading}
          onAdd={() => openDomaineModal()}
          onEdit={openDomaineModal}
          onDelete={handleDomaineDelete}
          addLabel="Ajouter un domaine"
        />
      ),
    },
    {
      key: "competences",
      label: "Compétences",
      children: (
        <CrudTab
          columns={compColumns}
          data={competences}
          loading={compLoading}
          onAdd={() => openCompModal()}
          onEdit={openCompModal}
          onDelete={handleCompDelete}
          addLabel="Ajouter une compétence"
        />
      ),
    },
    {
      key: "sousCompetences",
      label: "Sous-Compétences",
      children: (
        <CrudTab
          columns={scColumns}
          data={sousComps}
          loading={scLoading}
          onAdd={() => openScModal()}
          onEdit={openScModal}
          onDelete={handleScDelete}
          addLabel="Ajouter une sous-compétence"
        />
      ),
    },
    {
      key: "savoirs",
      label: "Savoirs",
      children: (
        <CrudTab
          columns={savoirColumns}
          data={savoirs}
          loading={savoirsLoading}
          onAdd={() => openSavoirModal()}
          onEdit={openSavoirModal}
          onDelete={handleSavoirDelete}
          addLabel="Ajouter un savoir"
        />
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>
          <ApartmentOutlined /> Gestion des Compétences
        </Title>

        <Tabs items={tabs} />

        {/* ─ Domaine Modal ─ */}
        <Modal
          title={editingDomaine ? "Modifier le domaine" : "Nouveau domaine"}
          open={domaineModal}
          onOk={handleDomaineSubmit}
          onCancel={() => setDomaineModal(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          destroyOnClose
        >
          <Form form={domaineForm} layout="vertical">
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input placeholder="ex: INF" />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input placeholder="ex: Informatique" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="actif" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Compétence Modal ─ */}
        <Modal
          title={editingComp ? "Modifier la compétence" : "Nouvelle compétence"}
          open={compModal}
          onOk={handleCompSubmit}
          onCancel={() => setCompModal(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          destroyOnClose
        >
          <Form form={compForm} layout="vertical">
            <Form.Item name="domaineId" label="Domaine" rules={[{ required: !editingComp, message: "Domaine obligatoire" }]}>
              <Select placeholder="Sélectionner un domaine" disabled={!!editingComp} showSearch optionFilterProp="children">
                {domaines.map((d) => (
                  <Option key={d.id} value={d.id}>{d.nom}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input placeholder="ex: INF-01" />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="ordre" label="Ordre">
              <Input type="number" min={1} />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Sous-Compétence Modal ─ */}
        <Modal
          title={editingSc ? "Modifier la sous-compétence" : "Nouvelle sous-compétence"}
          open={scModal}
          onOk={handleScSubmit}
          onCancel={() => setScModal(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          destroyOnClose
        >
          <Form form={scForm} layout="vertical">
            <Form.Item name="competenceId" label="Compétence" rules={[{ required: !editingSc, message: "Compétence obligatoire" }]}>
              <Select placeholder="Sélectionner une compétence" disabled={!!editingSc} showSearch optionFilterProp="children">
                {competences.map((c) => (
                  <Option key={c.id} value={c.id}>{c.nom} ({c.domaineNom})</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Savoir Modal ─ */}
        <Modal
          title={editingSavoir ? "Modifier le savoir" : "Nouveau savoir"}
          open={savoirModal}
          onOk={handleSavoirSubmit}
          onCancel={() => setSavoirModal(false)}
          okText="Enregistrer"
          cancelText="Annuler"
          destroyOnClose
        >
          <Form form={savoirForm} layout="vertical">
            <Form.Item name="sousCompetenceId" label="Sous-Compétence" rules={[{ required: !editingSavoir, message: "Sous-compétence obligatoire" }]}>
              <Select placeholder="Sélectionner une sous-compétence" disabled={!!editingSavoir} showSearch optionFilterProp="children">
                {sousComps.map((sc) => (
                  <Option key={sc.id} value={sc.id}>{sc.nom} ({sc.competenceNom})</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true, message: "Type obligatoire" }]}>
              <Select placeholder="Type de savoir">
                {TYPE_SAVOIR_OPTIONS.map((t) => (
                  <Option key={t} value={t}>{t}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}
