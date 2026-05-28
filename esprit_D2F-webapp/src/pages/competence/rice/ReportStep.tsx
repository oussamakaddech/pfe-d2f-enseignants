// Step 3 – Import recap and report.
// Shows import statistics, coverage per domain, enseignant↔competence table,
// History collapse, and orphan warnings.

import {
  Alert, Badge, Button, Card, Col, Collapse, Empty, Progress,
  Row, Space, Spin, Statistic, Typography,
} from "antd";
import {
  ApartmentOutlined, ArrowLeftOutlined, BarChartOutlined, BookOutlined,
  ExperimentOutlined, ReloadOutlined, UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import ImportBanner from "./report/ImportBanner";
import ImportSummaryCard from "./report/ImportSummaryCard";
import EnseignantCompTable, { buildEnseignantSavoirsMap, buildEnseignantRows } from "./report/EnseignantCompTable";

const { Text } = Typography;

const getCoverageStrokeColor = (taux: number) => {
  if (taux >= 70) return "#52c41a";
  if (taux >= 40) return "#faad14";
  return "#ff4d4f";
};

const buildExtractedNameMap = (extractedEnseignants: Record<string, unknown>[]) => new Map(
  extractedEnseignants.filter((ex) => ex.matched_id && ex.nom_complet).map((ex) => [String(ex.matched_id), ex.nom_complet as string]),
);

interface ReportStepProps {
  report?: Record<string, unknown> | null;
  importing?: boolean;
  handleImport: () => void;
  exportReportJson: () => void;
  departement: string;
  importHistory?: Record<string, unknown>[] | null;
  historyLoading?: boolean;
  loadImportHistory: () => void;
  allSavoirsFlat: Record<string, unknown>[];
  effectiveEnseignants: Record<string, unknown>[];
  extractedEnseignants: Record<string, unknown>[];
  setCurrentStep: (step: number) => void;
  resetAll: () => void;
}

export default function ReportStep({
  report, importing, handleImport, exportReportJson,
  importHistory, historyLoading, loadImportHistory,
  allSavoirsFlat, effectiveEnseignants, extractedEnseignants,
  setCurrentStep, resetAll,
}: Readonly<ReportStepProps>) {
  const navigate = useNavigate();
  const importStats = useMemo(() => report?.importStats ?? {
    upserted_domaines: report?.domainesCreated ?? 0,
    upserted_competences: report?.competencesCreated ?? 0,
    inserted_savoirs: report?.savoirsCreated ?? 0,
    updated_savoirs: report?.updatedSavoirs ?? 0,
    inserted_enseignant_links: report?.affectationsCreated ?? 0,
    errors: report?.errors ?? [],
  }, [report]);

  const orphans = useMemo(() => allSavoirsFlat.filter((s) => (s.enseignantsSuggeres as unknown[] ?? []).length === 0), [allSavoirsFlat]);
  const ensSavoirsMap = useMemo(() => buildEnseignantSavoirsMap(allSavoirsFlat), [allSavoirsFlat]);
  const hasEnseignantRows = ensSavoirsMap.size > 0;
  const extractedNameMap = useMemo(() => (hasEnseignantRows ? buildExtractedNameMap(extractedEnseignants) : new Map()), [hasEnseignantRows, extractedEnseignants]);
  const enseignantRows = useMemo(() => (hasEnseignantRows ? buildEnseignantRows(ensSavoirsMap, extractedNameMap, effectiveEnseignants) : []), [hasEnseignantRows, ensSavoirsMap, extractedNameMap, effectiveEnseignants]);

  const historyColumns = useMemo(() => ([
    { title: "Date", dataIndex: "generatedAt", render: (v: string) => v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short" as const, timeStyle: "short" as const }) : "–", width: 130 },
    { title: "Domaines", dataIndex: "domainesCreated", align: "center" as const, width: 90 },
    { title: "Compétences", dataIndex: "competencesCreated", align: "center" as const, width: 110 },
    { title: "Savoirs", dataIndex: "savoirsCreated", align: "center" as const, width: 80 },
    { title: "Affectations", dataIndex: "affectationsCreated", align: "center" as const, width: 110 },
    { title: "Enseignants", dataIndex: "enseignantsCovered", align: "center" as const, width: 140 },
    { title: "Résumé", dataIndex: "message", ellipsis: true },
  ]), []);

  const historyChildren = useMemo(() => {
    if (historyLoading) return <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>;
    if (!importHistory || importHistory.length === 0) return <Empty description="Aucun import précédent" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    const { Table } = require("antd") as typeof import("antd");
    return <Table dataSource={importHistory.map((r, i) => ({ ...r, key: i }))} size="small" pagination={{ pageSize: 5, size: "small" }} columns={historyColumns} />;
  }, [historyLoading, importHistory, historyColumns]);

  const statCards = report ? [
    { title: "Domaines", value: report.domainesCreated, color: "#1677ff", icon: <ApartmentOutlined /> },
    { title: "Compétences", value: report.competencesCreated, color: "#52c41a", icon: <BookOutlined /> },
    { title: "Sous-compétences", value: report.sousCompetencesCreated, color: "#13c2c2", icon: <ApartmentOutlined /> },
    { title: "Savoirs", value: report.savoirsCreated, color: "#722ed1", icon: <ExperimentOutlined /> },
    { title: "Affectations", value: report.affectationsCreated, color: "#fa8c16", icon: <UserOutlined /> },
    { title: "Enseignants", value: report.enseignantsCovered, color: "#eb2f96", icon: <UserOutlined /> },
  ] : [];

  return (
    <>
      <ImportBanner report={report} importing={importing} handleImport={handleImport} exportReportJson={exportReportJson} />
      <ImportSummaryCard importStats={importStats as Parameters<typeof ImportSummaryCard>[0]["importStats"]} />

      {statCards.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="rice-report-stats">
          {statCards.map(({ title, value, color, icon }) => (
            <Col xs={12} sm={8} lg={4} key={title}>
              <Card variant="borderless" style={{ borderLeft: `4px solid ${color}` }}>
                <Statistic title={title} value={value as number} prefix={icon} valueStyle={{ color, fontSize: 28 }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {report?.tauxCouvertureParDomaine && Object.keys(report.tauxCouvertureParDomaine as object).length > 0 && (
        <Card title={<Space><BarChartOutlined /> Taux de couverture par domaine</Space>} size="small" className="rice-report-coverage">
          {Object.entries(report.tauxCouvertureParDomaine as Record<string, number>).map(([nom, taux]) => (
            <Row key={nom} align="middle" gutter={16} style={{ marginBottom: 10 }}>
              <Col xs={8} sm={6}><Text style={{ fontSize: 13 }}>{nom}</Text></Col>
              <Col flex="auto"><Progress percent={taux} size="small" strokeColor={getCoverageStrokeColor(taux)} format={(p) => `${p}%`} /></Col>
            </Row>
          ))}
        </Card>
      )}

      <Collapse ghost style={{ marginBottom: 16 }}
        onChange={(keys) => { if ((keys as string[]).includes("history") && importHistory === null) loadImportHistory(); }}
        items={[{
          key: "history",
          label: <Space><BarChartOutlined /><span>Historique des imports RICE</span>{importHistory !== null && <Badge count={(importHistory ?? []).length} color="#1677ff" />}</Space>,
          children: historyChildren,
        }]}
      />

      {orphans.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message={`${orphans.length} savoir(s) sans enseignant assigné`}
          description={<span>Les savoirs suivants n&apos;ont aucun enseignant :{" "}<Text strong>{orphans.slice(0, 5).map((s) => s.nom).join(", ")}{orphans.length > 5 ? `… (+${orphans.length - 5})` : ""}</Text>.{" "}<Button type="link" size="small" style={{ padding: 0 }} onClick={() => setCurrentStep(2)}>Revenir à la révision</Button></span>}
        />
      )}

      <EnseignantCompTable rows={enseignantRows} setCurrentStep={setCurrentStep} />

      <div className="rice-step3-actions">
        {!report && <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(2)} className="rice-action-btn">Retour à la révision</Button>}
        {report && <Button type="primary" size="large" icon={<ApartmentOutlined />} onClick={() => navigate("/home/affectations")} className="rice-action-btn rice-action-btn-primary">Voir les affectations</Button>}
        <Button size="large" icon={<ReloadOutlined />} onClick={resetAll} className="rice-action-btn">Nouvelle analyse</Button>
      </div>
    </>
  );
}
