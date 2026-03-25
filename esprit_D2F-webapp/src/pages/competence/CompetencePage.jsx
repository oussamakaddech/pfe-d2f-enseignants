import { useCallback, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { ApartmentOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import CompetenceModals from "./components/CompetenceModals";
import ConsultationTab from "./components/ConsultationTab";
import CrudTab from "./components/CrudTab";
import CompetenceExpandedRow from "./components/CompetenceExpandedRow";
import useCompetenceCrud from "./hooks/useCompetenceCrud";
import useCompetencePageState from "./hooks/useCompetencePageState";
import useStructureData from "./hooks/useStructureData";
import {
  buildExportFileName,
  buildMatrixRows,
} from "./utils/consultationUtils";

const { Title } = Typography;

const NIVEAU_OPTIONS = [
  { value: "N1_DEBUTANT", label: "N1 - Debutant", color: "default" },
  { value: "N2_ELEMENTAIRE", label: "N2 - Elementaire", color: "blue" },
  { value: "N3_INTERMEDIAIRE", label: "N3 - Intermediaire", color: "cyan" },
  { value: "N4_AVANCE", label: "N4 - Avance", color: "green" },
  { value: "N5_EXPERT", label: "N5 - Expert", color: "gold" },
];

const niveauMeta = (niveau) =>
  NIVEAU_OPTIONS.find((n) => n.value === niveau) ?? { label: niveau ?? "-", color: "default" };

const extractLegacyPrerequisiteManual = (description) => {
  const marker = "Prerequis (manuel):";
  const raw = description || "";
  const idx = raw.indexOf(marker);
  if (idx === -1) return "";
  return raw.slice(idx + marker.length).trim();
};

export default function CompetencePage() {
  const [domaineForm] = Form.useForm();
  const [compForm] = Form.useForm();
  const [scForm] = Form.useForm();
  const [savoirForm] = Form.useForm();
  const [addNiveauForm] = Form.useForm();
  const [addPrerequisiteForm] = Form.useForm();

  const [prerequisiteModal, setPrerequisiteModal] = useState(false);
  const [prerequisiteTarget, setPrerequisiteTarget] = useState(null);
  const [prerequisites, setPrerequisites] = useState([]);
  const [prerequisiteLoading, setPrerequisiteLoading] = useState(false);

  const structure = useStructureData();
  const loadStructure = structure.loadStructure;
  const crud = useCompetenceCrud({
    onInvalidateStructure: structure.invalidateStructure,
    onSavoirMutated: structure.refreshMatrixIfNeeded,
    onSavoirsChanged: structure.setAllSavoirsHierarchie,
  });
  const prerequisiteApi = crud.prerequisite;
  const loadCompetences = crud.loadCompetences;
  const {
    activeTab,
    handleTabChange,
  } = useCompetencePageState({ crud, loadStructure });

  const consultationCrud = useMemo(() => ({
    domaines: crud.domaines || [],
    competences: crud.competences || [],
    sousComps: crud.sousComps || [],
    savoirs: crud.savoirs || [],
  }), [crud.domaines, crud.competences, crud.sousComps, crud.savoirs]);

  const handleExportExcel = () => {
    if (!structure.matrixCompId || !structure.matrixData) {
      Modal.info({
        title: "Export Excel",
        content:
          "Sélectionnez d'abord une compétence dans la section \"Affectation des savoirs par niveau de compétence\".",
      });
      return;
    }

    const competence = crud.competences.find(
      (c) => String(c.id) === String(structure.matrixCompId),
    );

    const matrixRows = buildMatrixRows(structure.matrixData);

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(matrixRows);

    XLSX.utils.sheet_add_aoa(
      sheet,
      [
        ["Affectation des savoirs par niveau de compétence"],
        ["Compétence", competence?.nom || "-"],
        ["Code", competence?.code || "-"],
      ],
      { origin: "A1" },
    );

    XLSX.utils.book_append_sheet(workbook, sheet, "Affectation Niveaux");

    XLSX.writeFile(workbook, buildExportFileName(competence?.code));
  };

  const loadPrerequisites = useCallback(async (competenceId) => {
    setPrerequisiteLoading(true);
    try {
      const data = await prerequisiteApi.getByCompetence(competenceId);
      setPrerequisites(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(err?.response?.data?.message || "Erreur lors du chargement des prerequis");
      setPrerequisites([]);
    } finally {
      setPrerequisiteLoading(false);
    }
  }, [prerequisiteApi]);

  const handleAddPrerequisite = useCallback(async () => {
    if (!prerequisiteTarget?.id) return;
    try {
      const values = await addPrerequisiteForm.validateFields();
      
      // Validation supplémentaire pour éviter l'envoi de null
      if (!values.prerequisiteId || values.prerequisiteId === "") {
        message.error("Veuillez sélectionner une compétence prérequise valide");
        return;
      }
      
      // S'assurer que l'ID est bien un nombre
      const prerequisiteId = typeof values.prerequisiteId === 'string' 
        ? parseInt(values.prerequisiteId, 10) 
        : values.prerequisiteId;
      
      if (isNaN(prerequisiteId)) {
        message.error("ID de compétence prérequise invalide");
        return;
      }
      
      // Préparer les données avec l'ID validé
      const payload = {
        ...values,
        prerequisiteId: prerequisiteId,
        niveauMinimum: values.niveauMinimum,
        description: values.description || null
      };
      
      await prerequisiteApi.add(prerequisiteTarget.id, payload);
      message.success("Prerequis ajoute");
      addPrerequisiteForm.resetFields();
      await Promise.all([
        loadPrerequisites(prerequisiteTarget.id),
        loadCompetences(),
      ]);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Erreur lors de l'ajout du prerequis");
    }
  }, [addPrerequisiteForm, prerequisiteTarget, prerequisiteApi, loadPrerequisites, loadCompetences]);

  const handleUpdatePrerequisiteNiveau = useCallback(async (id, niveauMinimum) => {
    if (!prerequisiteTarget?.id) return;
    try {
      await prerequisiteApi.updateNiveau(prerequisiteTarget.id, id, niveauMinimum);
      message.success("Niveau minimum mis a jour");
      await loadPrerequisites(prerequisiteTarget.id);
    } catch (err) {
      message.error(err?.response?.data?.message || "Erreur lors de la mise a jour du niveau");
    }
  }, [prerequisiteApi, loadPrerequisites, prerequisiteTarget]);

  const handleRemovePrerequisite = useCallback(async (id) => {
    if (!prerequisiteTarget?.id) return;
    try {
      await prerequisiteApi.remove(prerequisiteTarget.id, id);
      message.success("Prerequis supprime");
      await Promise.all([
        loadPrerequisites(prerequisiteTarget.id),
        loadCompetences(),
      ]);
    } catch (err) {
      message.error(err?.response?.data?.message || "Erreur lors de la suppression du prerequis");
    }
  }, [prerequisiteApi, loadPrerequisites, prerequisiteTarget, loadCompetences]);

  const prerequisiteColumns = useMemo(() => [
    {
      title: "Competence prerequise",
      key: "prerequisite",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.prerequisiteNom}</span>
          <Tag color="geekblue">{record.prerequisiteCode}</Tag>
        </Space>
      ),
    },
    {
      title: "Niveau minimum",
      dataIndex: "niveauMinimum",
      key: "niveauMinimum",
      width: 170,
      render: (value) => {
        const meta = niveauMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      render: (_, record) => (
        <Space>
          <Select
            size="small"
            value={record.niveauMinimum}
            style={{ width: 170 }}
            options={NIVEAU_OPTIONS}
            onChange={(niveauMinimum) =>
              handleUpdatePrerequisiteNiveau(record.id, niveauMinimum)
            }
          />
          <Popconfirm
            title="Supprimer ce prerequis ?"
            okText="Supprimer"
            cancelText="Annuler"
            onConfirm={() => handleRemovePrerequisite(record.id)}
          >
            <Button size="small" danger>Supprimer</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleRemovePrerequisite, handleUpdatePrerequisiteNiveau]);

  const compColumnsWithPrerequisite = useMemo(() => [
    ...crud.compColumns,
    {
      title: "Prerequis",
      key: "prerequisite",
      width: 260,
      render: (_, record) => {
        const names = record.prerequisiteNames ?? [];
        const manual = (record.prerequisiteManual || "").trim() || extractLegacyPrerequisiteManual(record.description);

        if (!names.length && !manual) return "-";
        return (
          <Space size={4} wrap>
            {names.map((name) => (
              <Tag key={`${record.id}-${name}`} color="orange">
                {name}
              </Tag>
            ))}
            {!names.length && !!manual && (
              <Tag color="orange">{manual}</Tag>
            )}
          </Space>
        );
      },
    },
  ], [crud.compColumns]);

  const prerequisiteCompetenceOptions = useMemo(() => (
    crud.competences
      .filter((c) => String(c.id) !== String(prerequisiteTarget?.id))
      .map((c) => ({
        value: c.id,
        label: `${c.nom} (${c.code})`,
        searchText: `${c.nom || ""} ${c.code || ""}`.toLowerCase(),
      }))
  ), [crud.competences, prerequisiteTarget]);

  /* ════════════════════════════════════════════════════════════════════════
     DÉFINITION DES ONGLETS
  ════════════════════════════════════════════════════════════════════════ */
  const tabs = [
    /* ── Domaines ─────────────────────────────────────────────────────── */
    {
      key: "domaines",
      label: "Domaines",
      children: (
        <CrudTab
          columns={crud.domaineColumns}
          data={crud.domaines}
          loading={crud.domainesLoading}
          onAdd={() => crud.openDomaineModal(domaineForm)}
          onEdit={(record) => crud.openDomaineModal(domaineForm, record)}
          onDelete={crud.handleDomaineDelete}
          addLabel="Ajouter un domaine"
          searchPlaceholder="Rechercher un domaine (nom, code…)"
        />
      ),
    },

    /* ── Compétences ──────────────────────────────────────────────────── */
    {
      key: "competences",
      label: "Compétences",
      children: (
        <CrudTab
          columns={compColumnsWithPrerequisite}
          data={crud.competences}
          loading={crud.compLoading}
          onAdd={() => crud.openCompModal(compForm)}
          onEdit={(record) => crud.openCompModal(compForm, record)}
          onDelete={crud.handleCompDelete}
          addLabel="Ajouter une compétence"
          searchPlaceholder="Rechercher une compétence (nom, code, domaine…)"
          tableProps={{
            expandable: {
              expandedRowRender: (record) => (
                <CompetenceExpandedRow
                  competence={record}
                  sousComps={crud.sousComps}
                  loading={crud.scLoading}
                  onAddRoot={(parent) =>
                    crud.openScModal(
                      scForm,
                      {
                        type: "competence",
                        id: parent.id,
                        nom: parent.nom,
                        code: parent.code,
                      },
                      null,
                    )
                  }
                  onAddChild={(parentSc) =>
                    crud.openScModal(
                      scForm,
                      {
                        type: "sousCompetence",
                        id: parentSc.id,
                        nom: parentSc.nom,
                        code: parentSc.code,
                        competenceId: parentSc.competenceId,
                      },
                      null,
                    )
                  }
                  onAddSavoir={(leafSc) =>
                    crud.openSavoirModal(savoirForm, null, leafSc)
                  }
                  onEdit={(row) => crud.openScModal(scForm, null, row)}
                  onDelete={crud.handleScDelete}
                />
              ),
              rowExpandable: () => true,
            },
          }}
        />
      ),
    },

    /* ── Savoirs ──────────────────────────────────────────────────────── */
    {
      key: "savoirs",
      label: "Savoirs",
      children: (
        <CrudTab
          columns={crud.savoirColumns}
          data={crud.savoirs}
          loading={crud.savoirsLoading}
          onAdd={() => crud.openSavoirModal(savoirForm)}
          onEdit={(record) => crud.openSavoirModal(savoirForm, record)}
          onDelete={crud.handleSavoirDelete}
          addLabel="Ajouter un savoir"
          searchPlaceholder="Rechercher un savoir (nom, code, type…)"
        />
      ),
    },

    /* ── Hiérarchie (+ recherche intégrée) ───────────────────────────── */
    {
      key: "hierarchie",
      label: (
        <span>
          <ApartmentOutlined /> Consultation
        </span>
      ),
      children: (
        <ConsultationTab
          structure={structure}
          crud={consultationCrud}
          handleExportExcel={handleExportExcel}
        />
      ),
    },
  ];

  /* ════════════════════════════════════════════════════════════════════════
     RENDU
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {crud.msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>
          <ApartmentOutlined /> Gestion des Compétences
        </Title>

        <Tabs
          items={tabs}
          activeKey={activeTab}
          onChange={handleTabChange}
        />
        <CompetenceModals
          crud={crud}
          structure={structure}
          domaineForm={domaineForm}
          compForm={compForm}
          scForm={scForm}
          savoirForm={savoirForm}
          addNiveauForm={addNiveauForm}
        />

        <Modal
          title={`Prerequis - ${prerequisiteTarget?.nom || ""}`}
          open={prerequisiteModal}
          width={700}
          destroyOnClose
          onCancel={() => {
            setPrerequisiteModal(false);
            setPrerequisiteTarget(null);
            setPrerequisites([]);
            addPrerequisiteForm.resetFields();
          }}
          footer={null}
        >
          <Table
            rowKey="id"
            size="small"
            loading={prerequisiteLoading}
            columns={prerequisiteColumns}
            dataSource={prerequisites}
            pagination={false}
            locale={{ emptyText: "Aucun prerequis pour cette competence" }}
            style={{ marginBottom: 16 }}
          />

          <Form
            form={addPrerequisiteForm}
            layout="inline"
            onFinish={handleAddPrerequisite}
          >
            <Form.Item
              name="prerequisiteId"
              rules={[{ required: true, message: "Selectionnez une competence" }]}
            >
              <Select
                style={{ width: 250 }}
                placeholder="Competence prerequise"
                showSearch
                options={prerequisiteCompetenceOptions}
                filterOption={(input, option) =>
                  option?.searchText?.includes(input.toLowerCase()) ?? false
                }
              />
            </Form.Item>

            <Form.Item
              name="niveauMinimum"
              rules={[{ required: true, message: "Selectionnez un niveau" }]}
            >
              <Select
                style={{ width: 180 }}
                placeholder="Niveau minimum"
                options={NIVEAU_OPTIONS}
              />
            </Form.Item>

            <Form.Item name="description">
              <Input style={{ width: 180 }} placeholder="Description (optionnel)" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={prerequisiteLoading}>
                Ajouter
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}
