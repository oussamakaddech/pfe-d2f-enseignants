// src/pages/competence/rice/UploadStep.jsx
// Step 0 – File upload and department/referential selection.
// Includes session restore alert (tree only – files cannot be serialized).

import { Badge, Button, Col, Row, Select, Space, Tag, Typography, Upload } from "antd";
import {
  ApartmentOutlined, BookOutlined,
  CheckCircleOutlined, CloudUploadOutlined,
  FileTextOutlined, FilePdfOutlined, FileWordOutlined,
  RobotOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { formatFileSize, DEPARTMENT_OPTIONS, useDepartmentConfig } from "./constants.jsx";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;



function FileIcon({ name }) {
  const ext = (name ?? "").split(".").pop().toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#cf1322", fontSize: 20 }} />;
  if (ext === "docx" || ext === "doc") return <FileWordOutlined style={{ color: "#1677ff", fontSize: 20 }} />;
  return <FileTextOutlined style={{ color: "#8c8c8c", fontSize: 20 }} />;
}
FileIcon.propTypes = { name: PropTypes.string };

const FEATURES = [
  { icon: <RobotOutlined />, color: "#1677ff", title: "IA Extraction", desc: "NLP Bloom + analyses sémantiques des objectifs pédagogiques" },
  { icon: <ApartmentOutlined />, color: "#722ed1", title: "Arbre Compétences", desc: "Domaines → Compétences → Sous-compétences → Savoirs" },
  { icon: <BookOutlined />, color: "#52c41a", title: "Niveaux Bloom", desc: "Classification automatique : Connaissance → Évaluation" },
  { icon: <ThunderboltOutlined />, color: "#fa8c16", title: "Affectation DnD", desc: "Assignez vos enseignants par glisser-déposer sur les savoirs" },
];

export default function UploadStep({
  files,
  analyzing,
  handleAnalyze,
  handleUploadChange,
  setCurrentStep,
  departement,
  setDepartement,
}) {
  const deptCfg = useDepartmentConfig(departement === "auto" ? "gc" : departement);
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

        {/* ── RIGHT: Features panel ──────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <div className="rice-features-panel">
            <div className="rice-features-header">
              <RobotOutlined className="rice-features-robot" />
              <div>
                <Title level={5} style={{ margin: 0, color: "#fff" }}>
                  Moteur RICE
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                  Intelligence artificielle pédagogique
                </Text>
              </div>
            </div>

            <div className="rice-feature-list">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="rice-feature-item"
                >
                  <div className="rice-feature-icon" style={{ "--fi-color": f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13, display: "block" }}>
                      {f.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
                      {f.desc}
                    </Text>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="rice-tip-box">
              <span className="rice-tip-icon">💡</span>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                Meilleures performances avec des fiches UE structurées incluant objectifs, compétences et volumes horaires.
              </Text>
            </div>
          </div>
        </Col>
      </Row>
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
};
