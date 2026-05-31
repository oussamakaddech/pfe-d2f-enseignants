// Step 0 – File upload and department / referential selection.

import {
  Alert, Button, Col, Divider, Drawer, Input, Row,
  Skeleton, Space, Table, Tag, Tooltip, Typography,
} from "antd";
import {
  ApartmentOutlined, CheckCircleOutlined, FilePdfOutlined,
  FileTextOutlined, FileWordOutlined, NumberOutlined,
  RobotOutlined, TeamOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { DepartmentBadge, useDepartmentConfig } from "./constants";
import DepartementSelector from "./upload/DepartementSelector";
import FileDropZone from "./upload/FileDropZone";

const { Text, Title } = Typography;

function FileIcon({ name }: Readonly<{ name?: string }>) {
  const ext = (name ?? "").split(".").pop()?.toLowerCase();
  if (ext === "pdf")  return <FilePdfOutlined  style={{ color: "#cf1322", fontSize: 18 }} />;
  if (ext === "docx" || ext === "doc")
                      return <FileWordOutlined  style={{ color: "#1677ff", fontSize: 18 }} />;
  return               <FileTextOutlined       style={{ color: "#8c8c8c", fontSize: 18 }} />;
}

/* ── Enseignants availability widget ────────────────────────── */
interface EnseignantsAvailabilityProps {
  loading?: boolean;
  error?: string;
  slowLoad?: boolean;
  allEnseignants: Record<string, unknown>[];
  departement?: string;
  onRetry: () => void;
  onContinue: () => void;
  onShowPreview: () => void;
}

function EnseignantsAvailability({
  loading, error, slowLoad, allEnseignants, departement,
  onRetry, onContinue, onShowPreview,
}: Readonly<EnseignantsAvailabilityProps>) {
  if (loading) {
    return (
      <div style={{ marginTop: 8 }}>
        {slowLoad && (
          <Alert
            type="warning"
            showIcon
            message="Chargement long — vérifiez la disponibilité du service"
            action={
              <Space size={4}>
                <Button size="small" onClick={onRetry}>Réessayer</Button>
                <Button size="small" type="text" onClick={onContinue}>Sans enseignants</Button>
              </Space>
            }
            style={{ marginBottom: 8 }}
          />
        )}
        <Skeleton.Input active size="small" style={{ width: 200 }} />
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, display: "block", marginTop: 6 }}>
          Chargement des enseignants…
        </Text>
      </div>
    );
  }

  if (error) {
    return <Alert type="warning" message={error} showIcon style={{ marginTop: 8 }} />;
  }

  if (allEnseignants.length === 0) {
    return (
      <Alert
        type="info" showIcon style={{ marginTop: 8 }}
        message="Aucun enseignant en base"
        description="Demandez à l'administrateur d'ajouter les enseignants."
      />
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <Space align="start">
        <TeamOutlined style={{ color: "#34d399", marginTop: 2 }} />
        <div>
          <Text style={{ color: "rgba(255,255,255,0.9)" }}>
            <strong style={{ color: "#34d399" }}>{allEnseignants.length}</strong>
            {" "}enseignants disponibles pour le matching IA
          </Text>
          {departement !== "auto" && (
            <div>
              <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                Filtrés par département <DepartmentBadge deptCode={departement} />
              </Text>
            </div>
          )}
          <Button
            type="link" size="small"
            style={{ padding: 0, height: 20, color: "#93c5fd" }}
            onClick={onShowPreview}
          >
            Voir la liste →
          </Button>
        </div>
      </Space>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
interface UploadStepProps {
  files: File[];
  analyzing?: boolean;
  handleAnalyze: () => void;
  handleUploadChange: (info: unknown) => void;
  setCurrentStep: (step: number) => void;
  departement?: string;
  setDepartement?: (dept: string) => void;
  allEnseignants?: Record<string, unknown>[];
  enseignantsLoading?: boolean;
  enseignantsError?: string;
  enseignantsLoadSlow?: boolean;
  onRetryEnseignants?: () => void;
  onContinueWithoutEnseignants?: () => void;
}

export default function UploadStep({
  files, analyzing, handleAnalyze, handleUploadChange,
  setCurrentStep, departement, setDepartement,
  allEnseignants = [],
  enseignantsLoading, enseignantsError, enseignantsLoadSlow,
  onRetryEnseignants = () => undefined,
  onContinueWithoutEnseignants = () => undefined,
}: Readonly<UploadStepProps>) {
  const [showEnseignantsPreview, setShowEnseignantsPreview] = useState(false);
  const [ensPreviewSearch, setEnsPreviewSearch] = useState("");

  const deptCfg    = useDepartmentConfig(departement === "auto" ? "gc" : (departement ?? "gc"));
  const etaSeconds = Math.max(20, files.length * 20);
  const plural     = files.length > 1 ? "s" : "";
  const deptLabel  = departement === "auto" ? "auto" : deptCfg.shortNom;

  const filteredPreviewRows = useMemo(() => {
    const q = ensPreviewSearch.trim().toLowerCase();
    if (!q) return allEnseignants;
    return allEnseignants.filter((e) => {
      const full = `${e.prenom ?? ""} ${e.nom ?? ""}`.toLowerCase();
      return (
        full.includes(q) ||
        String(e.departement ?? "").toLowerCase().includes(q) ||
        String(e.grade ?? "").toLowerCase().includes(q)
      );
    });
  }, [allEnseignants, ensPreviewSearch]);

  const guideSteps = [
    "Déposez vos fiches modules PDF / DOCX",
    "Sélectionnez le département ou laissez la détection auto",
    "Lancez l'analyse — résultats en 1–2 minutes",
  ];

  return (
    <div className="upload-step-root">
      <Row gutter={[24, 24]}>
        {/* ── Left column: dept + drop + CTA ───────────── */}
        <Col xs={24} lg={14}>
          <DepartementSelector departement={departement} setDepartement={setDepartement} />
          <FileDropZone files={files} handleUploadChange={handleUploadChange} />

          {/* CTA button */}
          <div className="rice-cta-block">
            <motion.div
              whileHover={files.length > 0 ? { scale: 1.02 } : {}}
              whileTap={files.length > 0 ? { scale: 0.97 } : {}}
            >
              <Tooltip title="Ctrl+Enter">
                <Button
                  type="primary"
                  size="large"
                  icon={<ThunderboltOutlined />}
                  onClick={handleAnalyze}
                  disabled={files.length === 0}
                  loading={analyzing}
                  className="rice-launch-btn"
                  block
                >
                  {analyzing ? "Analyse en cours…" : "Lancer l'analyse IA"}
                </Button>
              </Tooltip>
            </motion.div>

            <div style={{ textAlign: "center", marginTop: 10 }}>
              {files.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Chargez au moins un fichier pour activer l&apos;analyse
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <CheckCircleOutlined style={{ color: "#10b981", marginRight: 4 }} />
                  {files.length} fichier{plural} prêt{plural} · département{" "}
                  <strong style={{ color: deptCfg.color }}>{deptLabel}</strong>
                </Text>
              )}
            </div>
          </div>
        </Col>

        {/* ── Right column: dark guide panel ───────────── */}
        <Col xs={24} lg={10}>
          <div className="rice-features-panel">
            {/* header */}
            <div className="rice-features-header">
              <RobotOutlined className="rice-features-robot" />
              <div>
                <Title level={5} style={{ margin: 0, color: "#fff", fontSize: 14 }}>
                  Guide rapide
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                  Étapes recommandées
                </Text>
              </div>
            </div>

            <div className="rice-feature-list">
              {/* Enseignants status */}
              <div className="ens-availability">
                <Text strong style={{ color: "#fff", fontSize: 12, display: "block", marginBottom: 4 }}>
                  <TeamOutlined style={{ marginRight: 5 }} />
                  Enseignants disponibles
                </Text>
                <EnseignantsAvailability
                  loading={enseignantsLoading}
                  error={enseignantsError}
                  slowLoad={enseignantsLoadSlow}
                  allEnseignants={allEnseignants}
                  departement={departement}
                  onRetry={onRetryEnseignants}
                  onContinue={onContinueWithoutEnseignants}
                  onShowPreview={() => setShowEnseignantsPreview(true)}
                />
              </div>

              <Divider style={{ borderColor: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

              {/* Guide steps or file list */}
              {files.length === 0 ? (
                <>
                  {guideSteps.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.07 }}
                      className="rice-feature-item"
                    >
                      <div
                        className="rice-feature-icon"
                        style={{ "--fi-color": "#60a5fa" } as React.CSSProperties}
                      >
                        <NumberOutlined />
                      </div>
                      <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                        <strong style={{ color: "#93c5fd" }}>{i + 1}.</strong> {step}
                      </Text>
                    </motion.div>
                  ))}

                  <div className="rice-tip-box">
                    <span className="rice-tip-icon">💡</span>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                      Conseil : les fiches avec tableaux structurés donnent de meilleurs résultats.
                    </Text>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rice-feature-item"
                  >
                    <div
                      className="rice-feature-icon"
                      style={{ "--fi-color": "#60a5fa" } as React.CSSProperties}
                    >
                      <FileTextOutlined />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ fontSize: 12, color: "#fff", display: "block", marginBottom: 4 }}>
                        Fichiers sélectionnés
                      </Text>
                      {files.slice(0, 4).map((f) => (
                        <div
                          key={f.name}
                          style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}
                        >
                          <FileIcon name={f.name} />
                          <Text
                            style={{
                              color: "rgba(255,255,255,0.8)",
                              fontSize: 11,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              minWidth: 0,
                            }}
                          >
                            {f.name}
                          </Text>
                        </div>
                      ))}
                      {files.length > 4 && (
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                          + {files.length - 4} autre{files.length - 4 > 1 ? "s" : ""}
                        </Text>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.07 }}
                    className="rice-feature-item"
                  >
                    <div
                      className="rice-feature-icon"
                      style={{ "--fi-color": deptCfg.color } as React.CSSProperties}
                    >
                      <ApartmentOutlined />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 12, color: "#fff", display: "block", marginBottom: 4 }}>
                        Département détecté
                      </Text>
                      <Tag color={deptCfg.tagColor} style={{ marginTop: 2 }}>
                        {departement === "auto" ? "Auto" : deptCfg.nom}
                      </Tag>
                    </div>
                  </motion.div>

                  <div className="rice-tip-box">
                    <span className="rice-tip-icon">⏱️</span>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                      Durée estimée : ~{etaSeconds}s
                    </Text>
                  </div>
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Enseignants preview drawer ───────────────── */}
      <Drawer
        title="Enseignants disponibles"
        width={400}
        placement="right"
        open={showEnseignantsPreview}
        onClose={() => setShowEnseignantsPreview(false)}
      >
        <Input.Search
          placeholder="Rechercher…"
          value={ensPreviewSearch}
          onChange={(e) => setEnsPreviewSearch(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
        <Table
          size="small"
          rowKey={(r) => String(r.id ?? r.enseignantId)}
          pagination={{ pageSize: 8, size: "small" }}
          dataSource={filteredPreviewRows}
          columns={[
            { title: "Nom",          dataIndex: "nom",         width: 95 },
            { title: "Prénom",       dataIndex: "prenom",      width: 95 },
            { title: "Département",  dataIndex: "departement", width: 110, render: (d) => (d ? String(d).toUpperCase() : "–") },
            { title: "Grade",        dataIndex: "grade",       width: 90,  render: (g) => g ?? "–" },
            { title: "Modules",      width: 70, render: (_, row) => (row.modules as unknown[] ?? []).length },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ces enseignants seront matchés avec les noms trouvés dans vos fiches modules.
        </Text>
      </Drawer>
    </div>
  );
}
