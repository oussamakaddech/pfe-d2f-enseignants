import { Button, Card, Space, Typography } from "antd";
import { EyeOutlined, PictureOutlined } from "@ant-design/icons";
import type { SelectedFile } from "./docUtils";
import { formatFileSize } from "./docUtils";
import { DocEmpty } from "./DocEmpty";
import { DocFileIcon } from "./DocFileIcon";
import DocumentViewer from "../DocumentViewer";

const { Text } = Typography;

interface FilePreviewPanelProps {
  readonly selectedFile: SelectedFile | null;
}

export function FilePreviewPanel({ selectedFile }: FilePreviewPanelProps) {
  if (!selectedFile) {
    return (
      <DocEmpty
        variant="preview"
        icon={<PictureOutlined />}
        title="Aucun aperçu"
        text="Sélectionnez un fichier dans l'arborescence pour l'aperçu"
      />
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card
        variant="borderless"
        className="doc-file-card"
        styles={{ body: { padding: 16 } }}
      >
        <Space align="start" size={14} style={{ width: "100%" }}>
          <span className="doc-file-icon">
            <DocFileIcon name={selectedFile.name} />
          </span>
          <Space direction="vertical" size={6} style={{ flex: 1, minWidth: 0 }}>
            <Text strong className="doc-file-name">
              {selectedFile.name}
            </Text>
            <Text type="secondary">{formatFileSize(selectedFile.fileSize)}</Text>
            <Button
              type="primary"
              href={selectedFile.downloadUrl}
              target="_blank"
              icon={<EyeOutlined />}
              rel="noopener noreferrer"
              className="doc-btn-open"
            >
              Ouvrir / télécharger
            </Button>
          </Space>
        </Space>
      </Card>

      <DocumentViewer
        url={selectedFile.rawUrl}
        ext={selectedFile.name.split(".").pop() ?? ""}
      />
    </Space>
  );
}
