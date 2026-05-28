// FileDropZone — file upload drag-and-drop area for UploadStep.
// Extracted from UploadStep.tsx for DSI 200-line compliance.

import { Badge, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import {
  CheckCircleOutlined, CloudUploadOutlined,
  FileTextOutlined, FilePdfOutlined, FileWordOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { formatFileSize } from "../constants";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

function FileIcon({ name }: Readonly<{ name?: string }>) {
  const ext = (name ?? "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#cf1322", fontSize: 20 }} />;
  if (ext === "docx" || ext === "doc") return <FileWordOutlined style={{ color: "#1677ff", fontSize: 20 }} />;
  return <FileTextOutlined style={{ color: "#8c8c8c", fontSize: 20 }} />;
}

interface FileDropZoneProps {
  files: File[];
  handleUploadChange: (info: unknown) => void;
}

export default function FileDropZone({ files, handleUploadChange }: Readonly<FileDropZoneProps>) {
  const draggerFileList = useMemo<UploadFile[]>(
    () => files.map((f, i) => ({ uid: `file-${i}`, name: f.name, size: f.size, status: "done" as const, originFileObj: f as UploadFile["originFileObj"] })),
    [files],
  );

  return (
    <div className="rice-upload-section">
      <Text strong className="rice-section-label">Fiches UE / Modules pédagogiques</Text>

      <Dragger
        multiple accept=".pdf,.docx,.doc,.txt"
        beforeUpload={() => false}
        onChange={handleUploadChange}
        showUploadList={false}
        fileList={draggerFileList}
        className="rice-dragger"
      >
        <div className="rice-dragger-inner">
          <motion.div className="rice-dragger-icon-wrap" animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            <CloudUploadOutlined className="rice-dragger-icon" />
          </motion.div>
          <Title level={5} className="rice-dragger-title">Glisser-déposer vos fichiers ici</Title>
          <Paragraph className="rice-dragger-sub">ou <span className="rice-dragger-link">cliquer pour parcourir</span></Paragraph>
          <div className="rice-format-row">
            <span className="rice-fmt-tag pdf"><FilePdfOutlined /> PDF</span>
            <span className="rice-fmt-tag docx"><FileWordOutlined /> DOCX</span>
            <span className="rice-fmt-tag txt"><FileTextOutlined /> TXT</span>
          </div>
        </div>
      </Dragger>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rice-file-list">
            <div className="rice-file-list-header">
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <Text strong style={{ fontSize: 13 }}>
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}
              </Text>
              <Badge count={files.length} style={{ backgroundColor: "#52c41a" }} />
            </div>
            <div className="rice-file-items">
              {files.map((f, i) => (
                <motion.div key={f.name ?? i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ delay: i * 0.05 }} className="rice-file-item">
                  <FileIcon name={f.name} />
                  <div className="rice-file-info">
                    <Text
                      strong
                      style={{
                        fontSize: 12,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {f.name}
                    </Text>
                    {f.size > 0 && <Text type="secondary" style={{ fontSize: 11 }}>{formatFileSize(f.size)}</Text>}
                  </div>
                  <Badge color="green" text="Prêt" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
