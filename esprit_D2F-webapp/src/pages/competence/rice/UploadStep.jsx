// src/pages/competence/rice/UploadStep.jsx
// Step 0 – File upload and department/referential selection.
// Includes session restore alert (tree only – files cannot be serialized).

import {
  Alert, Badge, Button, Col, Drawer, Input, Row, Select, Skeleton, Space, Table, Tag, Tooltip, Typography, Upload,
} from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined, CloudUploadOutlined,
  FileTextOutlined, FilePdfOutlined, FileWordOutlined,
  RobotOutlined, TeamOutlined, ThunderboltOutlined, NumberOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  DepartmentBadge, DEPARTMENT_OPTIONS, formatFileSize, useDepartmentConfig,
} from "./constants.jsx";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;



function FileIcon({ name }) {
  const ext = (name ?? "").split(".").pop().toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#cf1322", fontSize: 20 }} />;
  if (ext === "docx" || ext === "doc") return <FileWordOutlined style={{ color: "#1677ff", fontSize: 20 }} />;
  return <FileTextOutlined style={{ color: "#8c8c8c", fontSize: 20 }} />;
}
FileIcon.propTypes = { name: PropTypes.string };

export default function UploadStep({
  files,
  analyzing,
  handleAnalyze,
  handleUploadChange,
  setCurrentStep,
  departement,
  setDepartement,
  allEnseignants,
  enseignantsLoading,
  enseignantsError,
  enseignantsLoadSlow,
  onRetryEnseignants,
  onContinueWithoutEnseignants,
}) {
  const [showEnseignantsPreview, setShowEnseignantsPreview] = useState(false);
  const [ensPreviewSearch, setEnsPreviewSearch] = useState("");
  const deptCfg = useDepartmentConfig(departement === "auto" ? "gc" : departement);
  const etaSeconds = Math.max(20, files.length * 20);
  const visibleFiles = files.slice(0, 5);
  const hiddenCount = Math.max(0, files.length - visibleFiles.length);
  const filteredPreviewRows = useMemo(() => {
    const q = ensPreviewSearch.trim().toLowerCase();
    if (!q) return allEnseignants;
    return (allEnseignants ?? []).filter((e) => {
      const full = `${e.prenom ?? ""} ${e.nom ?? ""}`.toLowerCase();
      return (
        full.includes(q)
        || String(e.departement ?? "").toLowerCase().includes(q)
        || String(e.grade ?? "").toLowerCase().includes(q)
      );
    });
  }, [allEnseignants, ensPreviewSearch]);

  return (
    <div className="upload-step-root">
      <Row gutter={[28, 28]}>
        {/* ── LEFT: Upload + Department ─────────────────────────────────── */}
        <Col xs={24} lg={14}>
          {/* Department selector */}
          <div className="rice-upload-section" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong className="rice-section-label">Département</Text>
              <Select
                style={{ width: "100%", maxWidth: 340 }}
                value={departement}
                onChange={setDepartement}
                optionFilterProp="labelText"
                showSearch
                options={[
                  { value: "auto", label: "\uD83D\uDD0D Détection automatique", labelText: "auto" },
                  ...DEPARTMENT_OPTIONS,
                ]}
              />
            </Space>
          </div>

          {/* Upload zone */}
          <div className="rice-upload-section">
            <Text strong className="rice-section-label">
              Fiches UE / Modules pédagogiques
            </Text>

            <Dragger
              multiple
              accept=".pdf,.docx,.doc,.txt"
              beforeUpload={() => false}
              onChange={handleUploadChange}
              showUploadList={false}
              fileList={files.map((f, i) => ({
                uid: `file-${i}`,
                name: f.name ?? f,
                size: f.size,
                status: "done",
                originFileObj: f,
              }))}
              className="rice-dragger"
            >
              <div className="rice-dragger-inner">
                <motion.div
                  className="rice-dragger-icon-wrap"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <CloudUploadOutlined className="rice-dragger-icon" />
                </motion.div>
                <Title level={5} className="rice-dragger-title">
                  Glisser-déposer vos fichiers ici
                </Title>
                <Paragraph className="rice-dragger-sub">
                  ou <span className="rice-dragger-link">cliquer pour parcourir</span>
                </Paragraph>
                <div className="rice-format-row">
                  <span className="rice-fmt-tag pdf"><FilePdfOutlined /> PDF</span>
                  <span className="rice-fmt-tag docx"><FileWordOutlined /> DOCX</span>
                  <span className="rice-fmt-tag txt"><FileTextOutlined /> TXT</span>
                </div>
              </div>
            </Dragger>

            {/* File list */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rice-file-list"
                >
                  <div className="rice-file-list-header">
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                    <Text strong style={{ fontSize: 13 }}>
                      {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}
                    </Text>
                    <Badge
                      count={files.length}
                      style={{ backgroundColor: "#52c41a" }}
                    />
                  </div>
                  <div className="rice-file-items">
                    {files.map((f, i) => (
                      <motion.div
                        key={f.name ?? i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: i * 0.05 }}
                        className="rice-file-item"
                      >
                        <FileIcon name={f.name} />
                        <div className="rice-file-info">
                          <Text strong style={{ fontSize: 12 }} ellipsis>
                            {f.name}
                          </Text>
                          {f.size > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {formatFileSize(f.size)}
                            </Text>
                          )}
                        </div>
                        <Tag color="green" style={{ fontSize: 10, margin: 0 }}>Prêt</Tag>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Launch CTA */}
          <div className="rice-cta-block">
            <motion.div
              whileHover={files.length > 0 ? { scale: 1.03 } : {}}
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
            {files.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block", textAlign: "center" }}>
                Chargez au moins un fichier pour activer l&apos;analyse
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block", textAlign: "center" }}>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />{" "}
                {files.length} fichier{files.length > 1 ? "s" : ""} pr\u00eat{files.length > 1 ? "s" : ""} \u2014 d\u00e9partement{" "}
                <strong style={{ color: deptCfg.color }}>{departement === "auto" ? "auto" : deptCfg.shortNom}</strong>
              </Text>
            )}
          </div>
        </Col>

        {/* ── RIGHT: Guide panel (contextual) ─────────────────────────────── */}
        <Col xs={24} lg={10}>
          <div className="rice-features-panel">
            <div className="rice-features-header">
              <RobotOutlined className="rice-features-robot" />
              <div>
                <Title level={5} style={{ margin: 0, color: "#fff" }}>
                  Guide rapide
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  Étapes recommandées pour l&apos;analyse
                </Text>
              </div>
            </div>

            <div className="rice-feature-list">
              <div className="ens-availability">
                <Text strong style={{ color: "#fff" }}>Enseignants disponibles</Text>

                {enseignantsLoading && (
                  <div style={{ marginTop: 8 }}>
                    <Skeleton.Input active size="small" style={{ width: 200 }} />
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, display: "block", marginTop: 6 }}>
                      Chargement des enseignants...
                    </Text>
                  </div>
                )}

                {enseignantsLoadSlow && enseignantsLoading && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Chargement long — vérifiez la disponibilité du service"
                    action={(
                      <Space>
                        <Button size="small" onClick={onRetryEnseignants}>Réessayer</Button>
                        <Button size="small" type="text" onClick={onContinueWithoutEnseignants}>Continuer sans enseignants</Button>
                      </Space>
                    )}
                    style={{ marginTop: 8 }}
                  />
                )}

                {!enseignantsLoading && enseignantsError && (
                  <Alert type="warning" message={enseignantsError} showIcon style={{ marginTop: 8 }} />
                )}

                {!enseignantsLoading && !enseignantsError && allEnseignants.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Space align="start">
                      <TeamOutlined style={{ color: "#52c41a", marginTop: 2 }} />
                      <div>
                        <Text style={{ color: "rgba(255,255,255,0.9)" }}>
                          <strong style={{ color: "#52c41a" }}>{allEnseignants.length}</strong>
                          {" "}enseignants disponibles pour le matching IA
                        </Text>
                        {departement !== "auto" && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                              Filtrés par département <DepartmentBadge deptCode={departement} />
                            </Text>
                          </div>
                        )}
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, height: 20, color: "#91caff" }}
                          onClick={() => setShowEnseignantsPreview(true)}
                        >
                          Voir la liste →
                        </Button>
                      </div>
                    </Space>
                  </div>
                )}

                {!enseignantsLoading && !enseignantsError && allEnseignants.length === 0 && (
                  <Alert
                    type="info"
                    showIcon
                    message="Aucun enseignant en base de données"
                    description="Demandez à l'administrateur d'ajouter les enseignants dans le module de gestion."
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>

              {files.length === 0 ? (
                <>
                  {[
                    "Déposez vos fiches modules PDF/DOCX",
                    "Sélectionnez le département ou laissez la détection auto",
                    "Lancez l'analyse — résultats en 1-2 minutes",
                  ].map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="rice-feature-item"
                    >
                      <div className="rice-feature-icon" style={{ "--fi-color": "#69b1ff" }}>
                        <NumberOutlined />
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 13, display: "block", color: "#fff" }}>
                          {`${i + 1}️⃣ ${step}`}
                        </Text>
                      </div>
                    </motion.div>
                  ))}

                  <div className="rice-tip-box" style={{ marginTop: 2 }}>
                    <span className="rice-tip-icon">💡</span>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                      Conseil : les fiches avec tableaux structurés donnent de meilleurs résultats.
                    </Text>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rice-feature-item"
                  >
                    <div className="rice-feature-icon" style={{ "--fi-color": "#40a9ff" }}>
                      <FileTextOutlined />
                    </div>
                    <div style={{ minWidth: 0, width: "100%" }}>
                      <Text strong style={{ fontSize: 13, display: "block" }}>Fichiers sélectionnés</Text>
                      {visibleFiles.map((f) => (
                        <div key={f.uid ?? f.name} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <FileIcon name={f.name} />
                          <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 12 }} ellipsis>
                            {f.name}
                          </Text>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4, display: "block" }}>
                          + {hiddenCount} autre{hiddenCount > 1 ? "s" : ""}
                        </Text>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.07 }}
                    className="rice-feature-item"
                  >
                    <div className="rice-feature-icon" style={{ "--fi-color": deptCfg.color }}>
                      <ApartmentOutlined />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13, display: "block" }}>Département</Text>
                      <Tag color={deptCfg.tagColor} style={{ marginTop: 4 }}>{departement === "auto" ? "Auto" : deptCfg.nom}</Tag>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.14 }}
                    className="rice-tip-box"
                  >
                    <span className="rice-tip-icon">⏱️</span>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                      ~{etaSeconds}s estimés
                    </Text>
                  </motion.div>

                  <Tooltip title="Ctrl+Enter">
                    <Button
                      type="primary"
                      icon={<ThunderboltOutlined />}
                      onClick={handleAnalyze}
                      disabled={files.length === 0}
                      loading={analyzing}
                      style={{
                        margin: "8px 22px 20px",
                        height: 42,
                        borderRadius: 10,
                        background: "#52c41a",
                        borderColor: "#52c41a",
                        fontWeight: 600,
                      }}
                      block
                    >
                      {analyzing ? "Analyse en cours…" : "Lancer"}
                    </Button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <Drawer
        title="Enseignants disponibles"
        width={400}
        placement="right"
        open={showEnseignantsPreview}
        onClose={() => setShowEnseignantsPreview(false)}
      >
        <Input.Search
          placeholder="Rechercher..."
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
            { title: "Nom", dataIndex: "nom", width: 95 },
            { title: "Prénom", dataIndex: "prenom", width: 95 },
            {
              title: "Département",
              dataIndex: "departement",
              width: 110,
              render: (d) => (d ? String(d).toUpperCase() : "-"),
            },
            { title: "Grade", dataIndex: "grade", width: 90, render: (g) => g || "-" },
            {
              title: "Modules",
              render: (_, row) => (row.modules ?? []).length,
              width: 70,
            },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Ces enseignants seront automatiquement matchés avec les noms trouvés dans vos fiches modules.
        </Text>
      </Drawer>
    </div>
  );
}

UploadStep.propTypes = {
  files: PropTypes.array.isRequired,
  analyzing: PropTypes.bool,
  handleAnalyze: PropTypes.func.isRequired,
  handleUploadChange: PropTypes.func.isRequired,
  setCurrentStep: PropTypes.func.isRequired,
  departement: PropTypes.string,
  setDepartement: PropTypes.func,
  allEnseignants: PropTypes.array,
  enseignantsLoading: PropTypes.bool,
  enseignantsError: PropTypes.string,
  enseignantsLoadSlow: PropTypes.bool,
  onRetryEnseignants: PropTypes.func,
  onContinueWithoutEnseignants: PropTypes.func,
};
