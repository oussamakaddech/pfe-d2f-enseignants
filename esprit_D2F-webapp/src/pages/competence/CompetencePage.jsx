import { useCallback, useMemo } from "react";
import {
  Form,
  Modal,
  Tabs,
  Typography,
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
  buildD3TreeData,
  buildExportFileName,
  buildMatrixRows,
} from "./utils/consultationUtils";

const { Title } = Typography;

export default function CompetencePage() {
  const [domaineForm] = Form.useForm();
  const [compForm] = Form.useForm();
  const [scForm] = Form.useForm();
  const [savoirForm] = Form.useForm();
  const [addNiveauForm] = Form.useForm();

  const structure = useStructureData();
  const loadStructure = structure.loadStructure;
  const crud = useCompetenceCrud({
    onInvalidateStructure: structure.invalidateStructure,
    onSavoirMutated: structure.refreshMatrixIfNeeded,
    onSavoirsChanged: structure.setAllSavoirsHierarchie,
  });
  const {
    activeTab,
    handleTabChange,
    viewMode,
    setViewMode,
    consultNiveau,
    setConsultNiveau,
    consultDomaine,
    setConsultDomaine,
    consultCompetence,
    setConsultCompetence,
    consultScStack,
    setConsultScStack,
    drawerSavoirs,
    setDrawerSavoirs,
    drawerVisible,
    setDrawerVisible,
    graphContainerRef,
    graphContainerWidth,
    buildCardTrigger,
  } = useCompetencePageState({ crud, loadStructure });

  const countSousCompForCompetence = (competenceId) =>
    crud.sousComps.filter(
      (sc) => String(sc.competenceId) === String(competenceId),
    ).length;

  const countSavoirsForSc = (scId) =>
    crud.savoirs.filter((s) => String(s.sousCompetenceId) === String(scId))
      .length;

  const getScChildren = useCallback(
    (competenceId, parentId = null) =>
      crud.sousComps.filter(
        (sc) =>
          String(sc.competenceId) === String(competenceId) &&
          (parentId === null
            ? sc.parentId == null
            : String(sc.parentId) === String(parentId)),
      ),
    [crud.sousComps],
  );

  const levelColorMap = {
    1: "#fa8c16",
    2: "#722ed1",
    3: "#13c2c2",
    4: "#f5222d",
    5: "#eb2f96",
  };

  const getScButtonColor = (sc) => {
    const level = Number(sc?.niveau ?? 1);
    return levelColorMap[level] || "#1890ff";
  };

  const buttonGridStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  };

  const tileButtonStyle = {
    minWidth: 200,
    minHeight: 64,
    borderRadius: 12,
    fontWeight: 700,
    margin: 8,
  };

  const currentConsultScList = useMemo(() => {
    if (!consultCompetence) return [];
    if (consultScStack.length === 0) {
      return getScChildren(consultCompetence.id, null);
    }
    const currentParent = consultScStack[consultScStack.length - 1];
    return getScChildren(consultCompetence.id, currentParent.id);
  }, [consultCompetence, consultScStack, getScChildren]);

  const d3TreeData = useMemo(
    () =>
      buildD3TreeData(
        crud.domaines,
        crud.competences,
        crud.sousComps,
        crud.savoirs,
      ),
    [crud.domaines, crud.competences, crud.sousComps, crud.savoirs],
  );

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
          columns={crud.compColumns}
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
          crud={crud}
          buildCardTrigger={buildCardTrigger}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleExportExcel={handleExportExcel}
          consultNiveau={consultNiveau}
          setConsultNiveau={setConsultNiveau}
          consultDomaine={consultDomaine}
          setConsultDomaine={setConsultDomaine}
          consultCompetence={consultCompetence}
          setConsultCompetence={setConsultCompetence}
          consultScStack={consultScStack}
          setConsultScStack={setConsultScStack}
          currentConsultScList={currentConsultScList}
          getScChildren={getScChildren}
          getScButtonColor={getScButtonColor}
          countSousCompForCompetence={countSousCompForCompetence}
          countSavoirsForSc={countSavoirsForSc}
          buttonGridStyle={buttonGridStyle}
          tileButtonStyle={tileButtonStyle}
          drawerSavoirs={drawerSavoirs}
          setDrawerSavoirs={setDrawerSavoirs}
          drawerVisible={drawerVisible}
          setDrawerVisible={setDrawerVisible}
          graphContainerRef={graphContainerRef}
          graphContainerWidth={graphContainerWidth}
          d3TreeData={d3TreeData}
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
      </div>
    </>
  );
}
