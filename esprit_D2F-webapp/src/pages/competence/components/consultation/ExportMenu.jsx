/* eslint-disable react/prop-types */
import { useCallback, useMemo, useState } from "react";
import { CodeOutlined, DownloadOutlined, FileExcelOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Dropdown, Tag, message } from "antd";
import {
  doExportCompetencesCSV,
  doExportSavoirsCSV,
  doExportSavoirsExcel,
  doExportStructureExcel,
  doExportStructureJSON,
  doExportSynthesisExcel,
} from "./exportUtils";
import { getFilteredCrud } from "./utils";

export default function ExportMenu({ crud, structure, stats, handleExportExcel }) {
  const [loading, setLoading] = useState(false);
  const [messageApi, ctxHolder] = message.useMessage();

  const domaineId = structure.selectedDomaine;
  const domaineName = useMemo(
    () => (domaineId ? structure.structure?.domaines?.find((d) => String(d.id) === String(domaineId))?.nom : null),
    [domaineId, structure.structure?.domaines],
  );

  const exportStats = useMemo(() => {
    const f = getFilteredCrud(crud, domaineId);
    return { domaines: f.domaines.length, competences: f.competences.length, savoirs: f.savoirs.length };
  }, [crud, domaineId]);

  const run = useCallback(async (key) => {
    setLoading(true);
    try {
      localStorage.setItem("ctp-export-format", key);
      if (key === "excel-full") doExportStructureExcel(crud, domaineId);
      else if (key === "excel-savoirs") doExportSavoirsExcel(crud, domaineId);
      else if (key === "excel-synthesis") doExportSynthesisExcel(crud, stats);
      else if (key === "excel-matrix") handleExportExcel();
      else if (key === "csv-savoirs") doExportSavoirsCSV(crud, domaineId);
      else if (key === "csv-competences") doExportCompetencesCSV(crud, domaineId);
      else if (key === "json-full") doExportStructureJSON(crud);
      messageApi.success("Export genere");
    } catch (err) {
      messageApi.error(`Erreur export : ${err?.message || "inconnue"}`);
    } finally {
      setLoading(false);
    }
  }, [crud, domaineId, handleExportExcel, messageApi, stats]);

  const filterSuffix = domaineName ? ` — ${domaineName}` : "";

  const menuItems = [
    {
      type: "group",
      label: <span className="ctp-export-group-label"><FileExcelOutlined /> Excel</span>,
      children: [
        { key: "excel-full", label: <span className="ctp-export-menu-item"><span>Structure complete{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-savoirs", label: <span className="ctp-export-menu-item"><span>Savoirs uniquement{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-synthesis", label: <span className="ctp-export-menu-item"><span>Synthese rapide</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
        { key: "excel-matrix", label: <span className="ctp-export-menu-item"><span>Matrice niveaux</span><span className="ctp-export-badge ctp-export-badge--xlsx">xlsx</span></span> },
      ],
    },
    { type: "divider" },
    {
      type: "group",
      label: <span className="ctp-export-group-label"><FileTextOutlined /> CSV</span>,
      children: [
        { key: "csv-savoirs", label: <span className="ctp-export-menu-item"><span>Savoirs{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--csv">csv</span></span> },
        { key: "csv-competences", label: <span className="ctp-export-menu-item"><span>Competences{filterSuffix}</span><span className="ctp-export-badge ctp-export-badge--csv">csv</span></span> },
      ],
    },
    { type: "divider" },
    {
      type: "group",
      label: <span className="ctp-export-group-label"><CodeOutlined /> JSON</span>,
      children: [
        { key: "json-full", label: <span className="ctp-export-menu-item"><span>Structure complete</span><span className="ctp-export-badge ctp-export-badge--json">json</span></span> },
      ],
    },
    { type: "divider" },
    {
      key: "__stats__",
      disabled: true,
      label: (
        <div className="ctp-export-stats" aria-label="Donnees a exporter">
          <span>{exportStats.domaines} dom.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>{exportStats.competences} comp.</span>
          <span className="ctp-export-stats__sep">·</span>
          <span>{exportStats.savoirs} savoir{exportStats.savoirs !== 1 ? "s" : ""}</span>
          {domaineName && <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>filtre actif</Tag>}
        </div>
      ),
    },
  ];

  return (
    <>
      {ctxHolder}
      <Dropdown
        menu={{ items: menuItems, onClick: ({ key }) => { if (key !== "__stats__") run(key); } }}
        trigger={["click"]}
        placement="bottomRight"
        aria-label="Menu d'export"
      >
        <Button icon={<DownloadOutlined />} size="middle" loading={loading}>
          Exporter <span className="ctp-export-caret">▾</span>
        </Button>
      </Dropdown>
    </>
  );
}
