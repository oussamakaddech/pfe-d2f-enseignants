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
} from "antd";
import { ApartmentOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/competence-page.css";
import CompetenceModals from "./components/CompetenceModals";
import ConsultationTab from "./components/ConsultationTab";
import CrudTab from "./components/CrudTab";
import CompetenceExpandedRow from "./components/CompetenceExpandedRow";
import useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";
import useCompetencePageState from "@/hooks/competence/useCompetencePageState";
import useStructureData from "@/hooks/competence/useStructureData";
import {
  buildExportFileName,
  buildMatrixRows,
} from "@/utils/helpers/consultationUtils";
import { NIVEAU_OPTIONS, NIVEAU_SAVOIR_OPTIONS } from "@/utils/constants/competenceOptions";

const niveauMeta = (niveau: string | undefined) =>
  NIVEAU_SAVOIR_OPTIONS.find((n) => n.value === niveau) ?? { label: niveau ?? "-", color: "default" };

const extractLegacyPrerequisiteManual = (description = "") => {
  const marker = "Prerequis (manuel):";
  const idx = description.indexOf(marker);
  if (idx === -1) return "";
  return description.slice(idx + marker.length).trim();
};

export default function CompetencePage() {
  const { message, modal } = useAppNotification();
  const [domaineForm] = Form.useForm();
  const [compForm] = Form.useForm();
  const [scForm] = Form.useForm();
  const [savoirForm] = Form.useForm();
  const [addNiveauForm] = Form.useForm();
  const [addPrerequisiteForm] = Form.useForm();

  const [prerequisiteModal, setPrerequisiteModal] = useState(false);
  const [prerequisiteTarget, setPrerequisiteTarget] = useState<any>(null);
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [prerequisiteLoading, setPrerequisiteLoading] = useState(false);

  const structure = useStructureData();
  const crud = useCompetenceCrud();
  const prerequisiteApi = crud.prerequisite;
  const loadCompetences = crud.loadCompetences;
  const {
    activeTab,
    handleTabChange,
  } = useCompetencePageState({ crud, loadStructure: structure.loadStructure });

  const consultationCrud = useMemo(() => ({
    domaines: crud.domaines || [],
    competences: crud.competences || [],
    sousComps: crud.sousComps || [],
    savoirs: crud.savoirs || [],
  }), [crud.domaines, crud.competences, crud.sousComps, crud.savoirs]);

  const handleExportExcel = () => {
    if (!structure.matrixCompId || !structure.matrixData) {
      modal.info({
        title: "Export Excel",
        content:
          "Sélectionnez d'abord une compétence dans la section \"Affectation des savoirs par niveau de compétence\".",
      });
      return;
    }

    const competence = (crud.competences as any[]).find(
      (c) => String(c.id) === String(structure.matrixCompId),
    );

    const matrixRows = buildMatrixRows(structure.matrixData);

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(matrixRows);

    XLSX.utils.sheet_add_aoa(
      sheet,
      [
        ["Affectation des savoirs par niveau de compétence"],
        ["Compétence", (competence as any)?.nom || "-"],
        ["Code", (competence as any)?.code || "-"],
      ],
      { origin: "A1" },
    );

    XLSX.utils.book_append_sheet(workbook, sheet, "Affectation Niveaux");

    XLSX.writeFile(workbook, buildExportFileName((competence as any)?.code));
  };

  const loadPrerequisites = useCallback(async (competenceId: any) => {
    setPrerequisiteLoading(true);
    try {
      const data = await prerequisiteApi.getByCompetence(competenceId);
      setPrerequisites(Array.isArray(data) ? data : []);
    } catch (err: any) {
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
      if (!values.prerequisiteId || values.prerequisiteId === "") {
        message.error("Veuillez sélectionner une compétence prérequise valide");
        return;
      }
      const prerequisiteId = typeof values.prerequisiteId === 'string'
        ? Number.parseInt(values.prerequisiteId, 10)
        : values.prerequisiteId;
      if (Number.isNaN(prerequisiteId)) {
        message.error("ID de compétence prérequise invalide");
        return;
      }
      const payload = {
        ...values,
        prerequisiteId,
        niveauMinimum: values.niveauMinimum,
        description: values.description || null,
      };
      await prerequisiteApi.add(prerequisiteTarget.id, payload);
      message.success("Prerequis ajoute");
      addPrerequisiteForm.resetFields();
      await Promise.all([
        loadPrerequisites(prerequisiteTarget.id),
        loadCompetences(),
      ]);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Erreur lors de l'ajout du prerequis");
    }
  }, [addPrerequisiteForm, loadCompetences, loadPrerequisites, message, prerequisiteApi, prerequisiteTarget]);

  const handleUpdatePrerequisiteNiveau = useCallback(async (id: any, niveauMinimum: any) => {
    if (!prerequisiteTarget?.id) return;
    try {
      await prerequisiteApi.updateNiveau(prerequisiteTarget.id, id, niveauMinimum);
      message.success("Niveau minimum mis a jour");
      await loadPrerequisites(prerequisiteTarget.id);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Erreur lors de la mise a jour du niveau");
    }
  }, [prerequisiteApi, loadPrerequisites, prerequisiteTarget]);

  const handleRemovePrerequisite = useCallback(async (id: any) => {
    if (!prerequisiteTarget?.id) return;
    try {
      await prerequisiteApi.remove(prerequisiteTarget.id, id);
      message.success("Prerequis supprime");
      await Promise.all([
        loadPrerequisites(prerequisiteTarget.id),
        loadCompetences(),
      ]);
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Erreur lors de la suppression du prerequis");
    }
  }, [prerequisiteApi, loadPrerequisites, prerequisiteTarget, loadCompetences]);

  const prerequisiteColumns = useMemo(() => [
    {
      title: "Competence prerequise",
      key: "prerequisite",
      render: (_: any, record: any) => (
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
      render: (value: any) => {
        const meta = niveauMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value: any) => (
        <span
          style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={value || ""}
        >
          {value || "-"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      render: (_: any, record: any) => (
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
            {names.map((name: any) => (
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
    (crud.competences as any[])
      .filter((c: any) => String(c.id) !== String(prerequisiteTarget?.id))
      .map((c: any) => ({
        value: c.id,
        label: `${c.nom} (${c.code})`,
        searchText: `${c.nom || ""} ${c.code || ""}`.toLowerCase(),
      }))
  ), [crud.competences, prerequisiteTarget]);

  const renderExpandedCompRow = useCallback((record: any) => (
    <CompetenceExpandedRow
      {...{
        competence: record,
        sousComps: crud.sousComps,
        loading: crud.scLoading,
        onAddRoot: (parent: any) =>
          crud.openScModal(scForm, { type: "competence", id: parent.id, nom: parent.nom, code: parent.code }, null),
        onAddChild: (parentSc: any) =>
          crud.openScModal(scForm, { type: "sousCompetence", id: parentSc.id, nom: parentSc.nom, code: parentSc.code, competenceId: parentSc.competenceId }, null),
        onAddSavoir: (leafSc: any) => crud.openSavoirModal(savoirForm, null, leafSc),
        onEdit: (row: any) => crud.openScModal(scForm, null, row),
        onDelete: crud.handleScDelete,
      } as any}
    />
  ), [crud, scForm, savoirForm]);

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
          onEdit={(record: any) => crud.openDomaineModal(domaineForm, record)}
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
          {...{
            columns: compColumnsWithPrerequisite,
            data: crud.competences,
            loading: crud.compLoading,
            onAdd: () => crud.openCompModal(compForm),
            onEdit: (record: any) => crud.openCompModal(compForm, record),
            onDelete: crud.handleCompDelete,
            addLabel: "Ajouter une compétence",
            searchPlaceholder: "Rechercher une compétence (nom, code, domaine…)",
            tableProps: {
              expandable: {
                expandedRowRender: renderExpandedCompRow,
                rowExpandable: () => true,
              },
            },
          } as any}
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
          onEdit={(record: any) => crud.openSavoirModal(savoirForm, record)}
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
    <div className="competence-page">
      <AppPageHeader
        icon={<ApartmentOutlined />}
        title="Référentiel des Compétences"
        subtitle="Gérer les domaines, compétences, sous-compétences et savoirs"
      />

      <Tabs
        className="competence-page-tabs"
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
        title={`Prérequis — ${prerequisiteTarget?.nom || ""}`}
        open={prerequisiteModal}
        width={700}
        destroyOnHidden
        onCancel={() => {
          setPrerequisiteModal(false);
          setPrerequisiteTarget(null);
          setPrerequisites([]);
          addPrerequisiteForm.resetFields();
        }}
        footer={null}
        className="competence-prerequisite-modal"
      >
        <Table
          rowKey="id"
          size="small"
          loading={prerequisiteLoading}
          columns={prerequisiteColumns}
          dataSource={prerequisites}
          pagination={false}
          locale={{ emptyText: "Aucun prérequis pour cette compétence" }}
          style={{ marginBottom: 16 }}
        />

        <Form
          form={addPrerequisiteForm}
          layout="inline"
          onFinish={handleAddPrerequisite}
        >
          <Form.Item
            name="prerequisiteId"
            rules={[{ required: true, message: "Sélectionnez une compétence" }]}
          >
            <Select
              style={{ width: 250 }}
              placeholder="Compétence prérequise"
              showSearch
              options={prerequisiteCompetenceOptions}
              filterOption={(input, option) =>
                option?.searchText?.includes(input.toLowerCase()) ?? false
              }
            />
          </Form.Item>

          <Form.Item
            name="niveauMinimum"
            rules={[{ required: true, message: "Sélectionnez un niveau" }]}
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
  );
}









