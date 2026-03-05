// src/pages/competence/rice/ReportStep.jsx
// Step 3 – Import recap and report.
// Shows import statistics, coverage per domain, enseignant↔competence table,
// History collapse, and orphan warnings.

import {
  Alert, Badge, Button, Card, Col, Collapse, Empty, Progress,
  Row, Space, Spin, Statistic, Table, Tag, Typography,
} from "antd";
import {
  ApartmentOutlined, ArrowLeftOutlined, BarChartOutlined, BookOutlined,
  DownloadOutlined, EditOutlined, ExperimentOutlined, EyeOutlined,
  PrinterOutlined, ReloadOutlined, SafetyCertificateOutlined, SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const { Text } = Typography;
const { Option } = { Option: null }; // unused – satisfy linter
void Option;

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
}) {
  const navigate = useNavigate();

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
            onClick={() => window.print()}
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
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={importing}
            onClick={handleImport}
            size="large"
            style={{ borderRadius: 10, flexShrink: 0 }}
          >
            Enregistrer
          </Button>
        </div>
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
          {Object.entries(report.tauxCouvertureParDomaine).map(([nom, taux]) => (
            <Row key={nom} align="middle" gutter={16} style={{ marginBottom: 10 }}>
              <Col xs={8} sm={6}>
                <Text style={{ fontSize: 13 }}>{nom}</Text>
              </Col>
              <Col flex="auto">
                <Progress
                  percent={taux}
                  size="small"
                  strokeColor={taux >= 70 ? "#52c41a" : taux >= 40 ? "#faad14" : "#ff4d4f"}
                  format={(p) => `${p}%`}
                />
              </Col>
            </Row>
          ))}
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
          children: (
            historyLoading ? (
              <div style={{ textAlign: "center", padding: 24 }}><Spin /></div>
            ) : !importHistory || importHistory.length === 0 ? (
              <Empty description="Aucun import précédent" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                dataSource={importHistory.map((r, i) => ({ ...r, key: i }))}
                size="small"
                pagination={{ pageSize: 5, size: "small" }}
                columns={[
                  {
                    title: "Date",
                    dataIndex: "generatedAt",
                    render: (v) => v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "–",
                    width: 130,
                  },
                  { title: "Domaines",    dataIndex: "domainesCreated",    align: "center", width: 90 },
                  { title: "Compétences", dataIndex: "competencesCreated", align: "center", width: 110 },
                  { title: "Savoirs",     dataIndex: "savoirsCreated",     align: "center", width: 80 },
                  { title: "Affectations",dataIndex: "affectationsCreated",align: "center", width: 110 },
                  { title: "Enseignants", dataIndex: "enseignantsCovered", align: "center", width: 140 },
                  { title: "Résumé",      dataIndex: "message",            ellipsis: true },
                ]}
              />
            )
          ),
        }]}
      />

      {/* ── Orphan warning ────────────────────────────────────────────────── */}
      {(() => {
        const orphans = allSavoirsFlat.filter((s) => (s.enseignantsSuggeres ?? []).length === 0);
        if (!orphans.length) return null;
        return (
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
        );
      })()}

      {/* ── Enseignant → Compétences table ────────────────────────────────── */}
      {(() => {
        const ensSavoirsMap = new Map();
        const shortenCode = (code) => {
          const parts = (code || "").split("-");
          return parts.length > 2 ? parts.slice(2).join("-") : code;
        };
        allSavoirsFlat.forEach((s) => {
          (s.enseignantsSuggeres ?? []).forEach((eid) => {
            const key = String(eid);
            if (!ensSavoirsMap.has(key)) ensSavoirsMap.set(key, []);
            const shortCodes = (s.gcCodes && s.gcCodes.length > 0) ? s.gcCodes : [shortenCode(s.code)];
            ensSavoirsMap.get(key).push({ nom: s.nom, code: s.code, gcCodes: shortCodes, label: s.label });
          });
        });
        if (ensSavoirsMap.size === 0) return null;

        const extractedNameMap = new Map(
          extractedEnseignants
            .filter((ex) => ex.matched_id && ex.nom_complet)
            .map((ex) => [String(ex.matched_id), ex.nom_complet]),
        );

        const rows = Array.from(ensSavoirsMap.entries()).map(([eid, savoirs]) => {
          const extractedName = extractedNameMap.get(eid);
          const ensObj = extractedName
            ? null
            : effectiveEnseignants.find((e) => String(e.id ?? e.enseignantId) === eid);
          const name = extractedName
            ?? (ensObj ? (ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : ensObj.nom) : eid);
          const initials = name !== eid
            ? name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
            : eid.slice(0, 2).toUpperCase();
          const allGcCodes = [...new Set(savoirs.flatMap((sv) => sv.gcCodes))];
          return { key: eid, name, initials, savoirs, allGcCodes };
        });

        const columns = [
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
        ];

        return (
          <Card
            title={<Space><UserOutlined /> Enseignants — Compétences techniques associées</Space>}
            size="small"
            className="rice-table-card"
            style={{ marginBottom: 16 }}
            extra={
              <Button
                size="small"
                type="text"
                icon={<SaveOutlined />}
                onClick={() => {
                  const csv =
                    "Enseignant;Compétences techniques associées\n" +
                    rows.map((r) => `"${r.name}";"${r.allGcCodes.join("; ")}"`).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `enseignants_competences_${departement}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exporter CSV
              </Button>
            }
          >
            <Table dataSource={rows} columns={columns} size="small" pagination={false} bordered={false} />
          </Card>
        );
      })()}

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
            onClick={() => navigate("/home/competences?tab=affectations")}
            className="rice-action-btn rice-action-btn-primary"
          >
            Consulter le référentiel
          </Button>
        )}
        <Button size="large" icon={<ReloadOutlined />} onClick={resetAll} className="rice-action-btn">
          Nouvelle analyse
        </Button>
      </div>
    </>
  );
}

ReportStep.propTypes = {
  report: PropTypes.object,
  importing: PropTypes.bool,
  handleImport: PropTypes.func.isRequired,
  exportReportJson: PropTypes.func.isRequired,
  departement: PropTypes.string.isRequired,
  importHistory: PropTypes.array,
  historyLoading: PropTypes.bool,
  loadImportHistory: PropTypes.func.isRequired,
  allSavoirsFlat: PropTypes.array.isRequired,
  effectiveEnseignants: PropTypes.array.isRequired,
  extractedEnseignants: PropTypes.array.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
  resetAll: PropTypes.func.isRequired,
};
