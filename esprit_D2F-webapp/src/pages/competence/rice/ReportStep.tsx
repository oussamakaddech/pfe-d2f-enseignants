// Step 3 – Import recap and report.
// Shows import statistics, coverage per domain, enseignant↔competence table,
// History collapse, and orphan warnings.

import {
  Alert, Badge, Button, Card, Col, Collapse, Empty, Progress,
  Row, Space, Spin, Statistic, Table, Tag, Tooltip, Typography,
} from "antd";
import {
  ApartmentOutlined, ArrowLeftOutlined, BarChartOutlined, BookOutlined,
  DownloadOutlined, EditOutlined, ExperimentOutlined, EyeOutlined,
  PrinterOutlined, ReloadOutlined, SafetyCertificateOutlined, SaveOutlined,
  UserOutlined, WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

const { Text } = Typography;

const getCoverageStrokeColor = (taux) => {
  if (taux >= 70) return "#52c41a";
  if (taux >= 40) return "#faad14";
  return "#ff4d4f";
};

const shortenCode = (code) => {
  const parts = (code || "").split("-");
  return parts.length > 2 ? parts.slice(2).join("-") : code;
};

const buildEnseignantSavoirsMap = (allSavoirsFlat) => {
  const ensSavoirsMap = new Map();
  allSavoirsFlat.forEach((s) => {
    (s.enseignantsSuggeres ?? []).forEach((eid) => {
      const key = String(eid);
      if (!ensSavoirsMap.has(key)) ensSavoirsMap.set(key, []);
      const shortCodes = (s.gcCodes && s.gcCodes.length > 0) ? s.gcCodes : [shortenCode(s.code)];
      ensSavoirsMap.get(key).push({ nom: s.nom, code: s.code, gcCodes: shortCodes, label: s.label });
    });
  });
  return ensSavoirsMap;
};

const buildExtractedNameMap = (extractedEnseignants) => new Map(
  extractedEnseignants
    .filter((ex) => ex.matched_id && ex.nom_complet)
    .map((ex) => [String(ex.matched_id), ex.nom_complet]),
);

const buildEnseignantRows = (ensSavoirsMap, extractedNameMap, effectiveEnseignants) => (
  Array.from(ensSavoirsMap.entries()).map(([eid, savoirs]) => {
    const extractedName = extractedNameMap.get(eid);
    const ensObj = extractedName
      ? null
      : effectiveEnseignants.find((e) => String(e.id ?? e.enseignantId) === eid);
    let resolvedName = eid;
    if (ensObj) resolvedName = ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : ensObj.nom;
    const name = extractedName ?? resolvedName;
    const initials = name === eid
      ? eid.slice(0, 2).toUpperCase()
      : name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    const allGcCodes = [...new Set(savoirs.flatMap((sv) => sv.gcCodes))];
    return { key: eid, name, initials, savoirs, allGcCodes };
  })
);

const buildEnseignantColumns = (setCurrentStep) => ([
  {
    title: "Enseignant",
    dataIndex: "name",
    key: "name",
    width: 180,
    render: (name, row) => (
      <Space>
        <Tag color="blue" style={{ fontWeight: 700, minWidth: 38, textAlign: "center" }}>
          {row.initials}
        </Tag>
        <Text style={{ fontSize: 13 }}>{name}</Text>
      </Space>
    ),
  },
  {
    title: "Compétences techniques associées",
    dataIndex: "allGcCodes",
    key: "gcCodes",
    render: (codes) => <Text style={{ fontSize: 13 }}>{codes.join(" ; ")}</Text>,
  },
  {
    title: "Nb savoirs",
    key: "count",
    width: 90,
    align: "center",
    render: (_, row) => (
      <Tag color="cyan" style={{ fontWeight: 700 }}>{row.allGcCodes.length}</Tag>
    ),
  },
  {
    title: "Action",
    key: "action",
    width: 100,
    align: "center",
    render: () => (
      <Button size="small" type="link" icon={<EditOutlined />} onClick={() => setCurrentStep(2)}>
        Modifier
      </Button>
    ),
  },
]);

interface ReportStepProps {
  report?: Record<string, unknown> | null;
  importing?: boolean;
  handleImport: () => void;
  exportReportJson: () => void;
  departement: string;
  importHistory?: Record<string, unknown>[];
  historyLoading?: boolean;
  loadImportHistory: () => void;
  allSavoirsFlat: Record<string, unknown>[];
  effectiveEnseignants: Record<string, unknown>[];
  extractedEnseignants: Record<string, unknown>[];
  setCurrentStep: (step: number) => void;
  resetAll: () => void;
}

export default function ReportStep({
  report,
  importing,
  handleImport,
  exportReportJson,
  departement,
  importHistory,
  historyLoading,
  loadImportHistory,
  allSavoirsFlat,
  effectiveEnseignants,
  extractedEnseignants,
  setCurrentStep,
  resetAll,
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

  const orphans = useMemo(() => allSavoirsFlat.filter((s) => (s.enseignantsSuggeres ?? []).length === 0), [allSavoirsFlat]);
  const ensSavoirsMap = useMemo(() => buildEnseignantSavoirsMap(allSavoirsFlat), [allSavoirsFlat]);
  const hasEnseignantRows = ensSavoirsMap.size > 0;
  const extractedNameMap = useMemo(() => (hasEnseignantRows ? buildExtractedNameMap(extractedEnseignants) : new Map()), [hasEnseignantRows, extractedEnseignants]);
  const enseignantRows = useMemo(() => (
    hasEnseignantRows ? buildEnseignantRows(ensSavoirsMap, extractedNameMap, effectiveEnseignants) : []
  ), [hasEnseignantRows, ensSavoirsMap, extractedNameMap, effectiveEnseignants]);
  const enseignantColumns = useMemo(() => (hasEnseignantRows ? buildEnseignantColumns(setCurrentStep) : []), [hasEnseignantRows, setCurrentStep]);

  const historyColumns = useMemo(() => ([
    {
      title: "Date",
      dataIndex: "generatedAt",
      render: (v) => v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "–",
      width: 130,
    },
    { title: "Domaines", dataIndex: "domainesCreated", align: "center", width: 90 },
    { title: "Compétences", dataIndex: "competencesCreated", align: "center", width: 110 },
    { title: "Savoirs", dataIndex: "savoirsCreated", align: "center", width: 80 },
    { title: "Affectations", dataIndex: "affectationsCreated", align: "center", width: 110 },
    { title: "Enseignants", dataIndex: "enseignantsCovered", align: "center", width: 140 },
    { title: "Résumé", dataIndex: "message", ellipsis: true },
  ]), []);

  const historyChildren = useMemo(() => {
    if (historyLoading) {
      return <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>;
    }
    if (!importHistory || importHistory.length === 0) {
      return <Empty description="Aucun import précédent" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
    return (
      <Table
        dataSource={importHistory.map((r, i) => ({ ...r, key: i }))}
        size="small"
        pagination={{ pageSize: 5, size: "small" }}
        columns={historyColumns}
      />
    );
  }, [historyLoading, importHistory, historyColumns]);

  return (
    <>
      {/* ── Success / Preview banner ───────────────────────────────────────── */}
      {report ? (
        <div className="rice-success-card">
          <div className="rice-success-icon"><SafetyCertificateOutlined /></div>
          <div className="rice-success-text" style={{ flex: 1 }}>
            <h4>Import RICE réussi !</h4>
            <p>{report.message ?? "Le référentiel a été enregistré avec succès en base de données."}</p>
            {report.generatedAt && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Généré le{" "}
                {new Date(report.generatedAt).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
            )}
          </div>
          <Button
            icon={<PrinterOutlined />}
            size="small"
            onClick={() => globalThis.print()}
            style={{ flexShrink: 0, marginLeft: 8 }}
          >
            Imprimer
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            style={{ flexShrink: 0, marginLeft: 8 }}
            onClick={exportReportJson}
          >
            Télécharger
          </Button>
        </div>
      ) : (
        <div className="rice-preview-card">
          <div className="rice-preview-icon"><EyeOutlined /></div>
          <div className="rice-preview-text" style={{ flex: 1 }}>
            <h4>Mode prévisualisation</h4>
            <p>Les données ne sont pas encore enregistrées. Vérifiez le récapitulatif ci-dessous, puis cliquez sur « Enregistrer » lorsque vous êtes prêt.</p>
          </div>
          <Tooltip title="Ctrl+Enter">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={importing}
              onClick={handleImport}
              size="large"
              style={{ borderRadius: 10, flexShrink: 0 }}
            >
              Valider et importer
            </Button>
          </Tooltip>
        </div>
      )}

      <Card
        title="Résumé de l'import"
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Domaines importés : <Text strong>{importStats.upserted_domaines}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Compétences : <Text strong>{importStats.upserted_competences}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Savoirs insérés : <Text strong>{importStats.inserted_savoirs}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">🔄 Savoirs mis à jour : <Text strong>{importStats.updated_savoirs}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">👨‍🏫 Liens enseignants : <Text strong>{importStats.inserted_enseignant_links}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}>
            <Card size="small" style={{ borderColor: (importStats.errors?.length ?? 0) > 0 ? "#ff4d4f" : undefined }}>
              ⚠️ Erreurs : <Text strong style={{ color: (importStats.errors?.length ?? 0) > 0 ? "#ff4d4f" : undefined }}>{importStats.errors?.length ?? 0}</Text>
            </Card>
          </Col>
        </Row>

      </Card>

      {(importStats.errors?.length ?? 0) > 0 && (
        <Collapse
          style={{ marginBottom: 16 }}
          items={[{
            key: "errs",
            label: `Voir les erreurs (${importStats.errors.length})`,
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                {importStats.errors.map((err, idx) => (
                  <Alert key={`${idx}-${err}`} type="warning" showIcon icon={<WarningOutlined />} message={String(err)} />
                ))}
              </Space>
            ),
          }]}
        />
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      {report && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="rice-report-stats">
          {[
            { title: "Domaines",         value: report.domainesCreated,       color: "#1677ff", icon: <ApartmentOutlined /> },
            { title: "Compétences",      value: report.competencesCreated,    color: "#52c41a", icon: <BookOutlined /> },
            { title: "Sous-compétences", value: report.sousCompetencesCreated,color: "#13c2c2", icon: <ApartmentOutlined /> },
            { title: "Savoirs",          value: report.savoirsCreated,        color: "#722ed1", icon: <ExperimentOutlined /> },
            { title: "Affectations",     value: report.affectationsCreated,   color: "#fa8c16", icon: <UserOutlined /> },
            { title: "Enseignants",      value: report.enseignantsCovered,    color: "#eb2f96", icon: <UserOutlined /> },
          ].map(({ title, value, color, icon }) => (
            <Col xs={12} sm={8} lg={4} key={title}>
              <Card variant="borderless" style={{ borderLeft: `4px solid ${color}` }}>
                <Statistic
                  title={title}
                  value={value}
                  prefix={icon}
                  valueStyle={{ color, fontSize: 28 }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* ── Coverage per domain ───────────────────────────────────────────── */}
      {report?.tauxCouvertureParDomaine && Object.keys(report.tauxCouvertureParDomaine).length > 0 && (
        <Card
          title={<Space><BarChartOutlined /> Taux de couverture par domaine</Space>}
          size="small"
          className="rice-report-coverage"
        >
          {Object.entries(report.tauxCouvertureParDomaine).map(([nom, taux]) => {
            const tauxStrokeColor = getCoverageStrokeColor(taux);
            return (
              <Row key={nom} align="middle" gutter={16} style={{ marginBottom: 10 }}>
                <Col xs={8} sm={6}>
                  <Text style={{ fontSize: 13 }}>{nom}</Text>
                </Col>
                <Col flex="auto">
                  <Progress
                    percent={taux}
                    size="small"
                    strokeColor={tauxStrokeColor}
                    format={(p) => `${p}%`}
                  />
                </Col>
              </Row>
            );
          })}
        </Card>
      )}

      {/* ── Import history ────────────────────────────────────────────────── */}
      <Collapse
        ghost
        style={{ marginBottom: 16 }}
        onChange={(keys) => {
          if (keys.includes("history") && importHistory === null) loadImportHistory();
        }}
        items={[{
          key: "history",
          label: (
            <Space>
              <BarChartOutlined />
              <span>Historique des imports RICE</span>
              {importHistory !== null && <Badge count={importHistory.length} color="#1677ff" />}
            </Space>
          ),
          children: historyChildren,
        }]}
      />

      {/* ── Orphan warning ────────────────────────────────────────────────── */}
      {orphans.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${orphans.length} savoir(s) sans enseignant assigné`}
          description={
            <span>
              Les savoirs suivants n&apos;ont aucun enseignant :{" "}
              <Text strong>
                {orphans.slice(0, 5).map((s) => s.nom).join(", ")}
                {orphans.length > 5 ? `… (+${orphans.length - 5})` : ""}
              </Text>.{" "}
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setCurrentStep(2)}>
                Revenir à la révision
              </Button>
            </span>
          }
        />
      )}

      {/* ── Enseignant → Compétences table ────────────────────────────────── */}
      {hasEnseignantRows && (
        <Card
          title={<Space><UserOutlined /> Enseignants — Compétences techniques associées</Space>}
          size="small"
          className="rice-table-card"
          style={{ marginBottom: 16 }}
        >
          <Table dataSource={enseignantRows} columns={enseignantColumns} size="small" pagination={false} bordered={false} />
        </Card>
      )}

      {/* ── Step 3 actions ────────────────────────────────────────────────── */}
      <div className="rice-step3-actions">
        {!report && (
          <Button size="large" icon={<ArrowLeftOutlined />} onClick={() => setCurrentStep(2)} className="rice-action-btn">
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
        <Button size="large" icon={<ReloadOutlined />} onClick={resetAll} className="rice-action-btn">
          Nouvelle analyse
        </Button>
      </div>
    </>
  );
}







