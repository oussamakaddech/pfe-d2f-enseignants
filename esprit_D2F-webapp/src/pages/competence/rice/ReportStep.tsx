// Step 3 – Import recap and report.

import {
  Alert, Badge, Button, Card, Col, Collapse, Empty,
  Progress, Row, Space, Spin, Statistic, Typography,
} from "antd";
import {
  ApartmentOutlined, ArrowLeftOutlined, BarChartOutlined,
  BookOutlined, ExperimentOutlined, ReloadOutlined, UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import ImportBanner from "./report/ImportBanner";
import ImportSummaryCard from "./report/ImportSummaryCard";
import EnseignantCompTable, {
  buildEnseignantSavoirsMap,
  buildEnseignantRows,
} from "./report/EnseignantCompTable";

const { Text, Title } = Typography;

const coverageColor = (taux: number) => {
  if (taux >= 70) return "#10b981";
  if (taux >= 40) return "#f59e0b";
  return "#ef4444";
};

const buildExtractedNameMap = (extractedEnseignants: Record<string, unknown>[]) =>
  new Map(
    extractedEnseignants
      .filter((ex) => ex.matched_id && ex.nom_complet)
      .map((ex) => [String(ex.matched_id), ex.nom_complet as string]),
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

  const importStats = useMemo(
    () =>
      report?.importStats ?? {
        upserted_domaines:          report?.domainesCreated     ?? 0,
        upserted_competences:       report?.competencesCreated  ?? 0,
        inserted_savoirs:           report?.savoirsCreated      ?? 0,
        updated_savoirs:            report?.updatedSavoirs      ?? 0,
        inserted_enseignant_links:  report?.affectationsCreated ?? 0,
        errors:                     report?.errors ?? [],
      },
    [report],
  );

  const orphans = useMemo(
    () => allSavoirsFlat.filter((s) => (s.enseignantsSuggeres as unknown[] ?? []).length === 0),
    [allSavoirsFlat],
  );

  const ensSavoirsMap      = useMemo(() => buildEnseignantSavoirsMap(allSavoirsFlat), [allSavoirsFlat]);
  const hasEnseignantRows  = ensSavoirsMap.size > 0;
  const extractedNameMap   = useMemo(
    () => (hasEnseignantRows ? buildExtractedNameMap(extractedEnseignants) : new Map()),
    [hasEnseignantRows, extractedEnseignants],
  );
  const enseignantRows = useMemo(
    () => (hasEnseignantRows ? buildEnseignantRows(ensSavoirsMap, extractedNameMap, effectiveEnseignants) : []),
    [hasEnseignantRows, ensSavoirsMap, extractedNameMap, effectiveEnseignants],
  );

  const historyColumns = useMemo(
    () => [
      {
        title: "Date", dataIndex: "generatedAt",
        render: (v: string) =>
          v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short" as const, timeStyle: "short" as const }) : "–",
        width: 130,
      },
      { title: "Domaines",    dataIndex: "domainesCreated",    align: "center" as const, width: 90 },
      { title: "Compétences", dataIndex: "competencesCreated", align: "center" as const, width: 110 },
      { title: "Savoirs",     dataIndex: "savoirsCreated",     align: "center" as const, width: 80 },
      { title: "Affectations",dataIndex: "affectationsCreated",align: "center" as const, width: 110 },
      { title: "Enseignants", dataIndex: "enseignantsCovered", align: "center" as const, width: 140 },
      { title: "Résumé",      dataIndex: "message", ellipsis: true },
    ],
    [],
  );

  const historyChildren = useMemo(() => {
    if (historyLoading) return <div style={{ textAlign: "center", padding: 32 }}><Spin /></div>;
    if (!importHistory || importHistory.length === 0)
      return <Empty description="Aucun import précédent" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    const { Table } = require("antd") as typeof import("antd");
    return (
      <Table
        dataSource={importHistory.map((r, i) => ({ ...r, key: i }))}
        size="small"
        pagination={{ pageSize: 5, size: "small" }}
        columns={historyColumns}
      />
    );
  }, [historyLoading, importHistory, historyColumns]);

  /* ── Stat cards ─────────────────────────────────────────────── */
  const statCards = report
    ? [
        { title: "Domaines",     value: Number(report.domainesCreated       ?? 0), color: "#2563eb", icon: <ApartmentOutlined /> },
        { title: "Compétences",  value: Number(report.competencesCreated    ?? 0), color: "#10b981", icon: <BookOutlined /> },
        { title: "Sous-comp.",   value: Number(report.sousCompetencesCreated?? 0), color: "#06b6d4", icon: <ApartmentOutlined /> },
        { title: "Savoirs",      value: Number(report.savoirsCreated        ?? 0), color: "#7c3aed", icon: <ExperimentOutlined /> },
        { title: "Affectations", value: Number(report.affectationsCreated   ?? 0), color: "#f59e0b", icon: <UserOutlined /> },
        { title: "Enseignants",  value: Number(report.enseignantsCovered    ?? 0), color: "#ec4899", icon: <UserOutlined /> },
      ]
    : [];

  return (
    <>
      <ImportBanner report={report} importing={importing} handleImport={handleImport} exportReportJson={exportReportJson} />
      <ImportSummaryCard importStats={importStats as Parameters<typeof ImportSummaryCard>[0]["importStats"]} />

      {/* ── Stat cards grid ──────────────────────────── */}
      {statCards.length > 0 && (
        <div>
          <Title level={5} style={{ margin: "0 0 12px", color: "#0f172a" }}>
            <BarChartOutlined style={{ marginRight: 8, color: "#2563eb" }} />
            Résultats de l&apos;import
          </Title>
          <Row gutter={[12, 12]} className="rice-report-stats">
            {statCards.map(({ title, value, color, icon }) => (
              <Col xs={12} sm={8} lg={4} key={title}>
                <Card
                  variant="borderless"
                  style={{
                    borderTop: `3px solid ${color}`,
                    borderRadius: 12,
                    textAlign: "center",
                  }}
                >
                  <Statistic
                    title={title}
                    value={value}
                    prefix={icon}
                    valueStyle={{ color, fontSize: 26, fontWeight: 800 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* ── Coverage per domain ──────────────────────── */}
      {report?.tauxCouvertureParDomaine &&
        Object.keys(report.tauxCouvertureParDomaine as object).length > 0 && (
          <Card
            title={
              <Space>
                <BarChartOutlined />
                Taux de couverture par domaine
              </Space>
            }
            size="small"
            className="rice-report-coverage"
          >
            {Object.entries(report.tauxCouvertureParDomaine as Record<string, number>).map(
              ([nom, taux]) => (
                <Row key={nom} align="middle" gutter={16} style={{ marginBottom: 10 }}>
                  <Col xs={8} sm={6}>
                    <Text style={{ fontSize: 13 }}>{nom}</Text>
                  </Col>
                  <Col flex="auto">
                    <Progress
                      percent={taux}
                      size="small"
                      strokeColor={coverageColor(taux)}
                      format={(p) => `${p}%`}
                    />
                  </Col>
                </Row>
              ),
            )}
          </Card>
        )}

      {/* ── Import history ───────────────────────────── */}
      <Collapse
        ghost
        onChange={(keys) => {
          if ((keys as string[]).includes("history") && importHistory === null)
            loadImportHistory();
        }}
        items={[
          {
            key: "history",
            label: (
              <Space>
                <BarChartOutlined />
                <span>Historique des imports RICE</span>
                {importHistory !== null && (
                  <Badge count={(importHistory ?? []).length} color="#2563eb" />
                )}
              </Space>
            ),
            children: historyChildren,
          },
        ]}
      />

      {/* ── Orphan warning ───────────────────────────── */}
      {orphans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${orphans.length} savoir(s) sans enseignant assigné`}
          description={
            <span>
              Savoirs non couverts :{" "}
              <Text strong>
                {orphans.slice(0, 5).map((s) => s.nom).join(", ")}
                {orphans.length > 5 ? `… (+${orphans.length - 5})` : ""}
              </Text>
              .{" "}
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => setCurrentStep(2)}
              >
                Revenir à la révision
              </Button>
            </span>
          }
        />
      )}

      {/* ── Enseignant ↔ Compétences table ──────────── */}
      <EnseignantCompTable rows={enseignantRows} setCurrentStep={setCurrentStep} />

      {/* ── Footer actions ───────────────────────────── */}
      <div className="rice-step3-actions">
        {!report && (
          <Button
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => setCurrentStep(2)}
            className="rice-action-btn"
          >
            Retour à la révision
          </Button>
        )}
        {report && (
          <Button
            type="primary"
            size="large"
            icon={<ApartmentOutlined />}
            onClick={() => navigate("/home/affectations")}
            className="rice-action-btn rice-action-btn-primary"
          >
            Voir les affectations
          </Button>
        )}
        <Button
          size="large"
          icon={<ReloadOutlined />}
          onClick={resetAll}
          className="rice-action-btn"
        >
          Nouvelle analyse
        </Button>
      </div>
    </>
  );
}
