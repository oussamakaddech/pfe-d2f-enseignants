import { InboxOutlined, FileExcelOutlined, DeleteOutlined } from "@ant-design/icons";
import { Upload, Typography, Space, Button } from "antd";
import type { UploadProps } from "antd";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Dragger } = Upload;
const { Text } = Typography;

/** Limite alignée sur le défaut backend (calendar.import.max-file-size-bytes = 10 Mo). */
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * Sélection + validation côté client d'un fichier .xlsx (format & taille) avant
 * envoi au backend. N'effectue aucun upload automatique.
 */
export default function CalendarFileUpload({ file, onFileChange, disabled }: Readonly<Props>) {
  const { message } = useAppNotification();

  const validate = (candidate: File): boolean => {
    const isXlsx =
      candidate.type === XLSX_MIME || candidate.name.toLowerCase().endsWith(".xlsx");
    if (!isXlsx) {
      message.error("Seuls les fichiers Excel .xlsx sont acceptés.");
      return false;
    }
    if (candidate.size === 0) {
      message.error("Le fichier est vide.");
      return false;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      message.error(`Fichier trop volumineux (max ${MAX_SIZE_BYTES / (1024 * 1024)} Mo).`);
      return false;
    }
    return true;
  };

  const draggerProps: UploadProps = {
    multiple: false,
    accept: ".xlsx",
    showUploadList: false,
    disabled,
    beforeUpload: (candidate) => {
      if (validate(candidate)) {
        onFileChange(candidate);
      }
      return Upload.LIST_IGNORE; // pas d'upload auto : géré par la page
    },
  };

  if (file) {
    return (
      <Space
        align="center"
        style={{
          justifyContent: "space-between",
          width: "100%",
          padding: 16,
          border: "1px dashed #d9d9d9",
          borderRadius: 8,
        }}
      >
        <Space>
          <FileExcelOutlined style={{ fontSize: 24, color: "#1D6F42" }} />
          <div>
            <Text strong>{file.name}</Text>
            <br />
            <Text type="secondary">{(file.size / 1024).toFixed(0)} Ko</Text>
          </div>
        </Space>
        <Button
          icon={<DeleteOutlined />}
          danger
          type="text"
          disabled={disabled}
          onClick={() => onFileChange(null)}
        >
          Retirer
        </Button>
      </Space>
    );
  }

  return (
    <Dragger {...draggerProps}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Cliquez ou glissez le calendrier des ateliers (.xlsx)</p>
      <p className="ant-upload-hint">Format Excel uniquement — taille maximale 10 Mo.</p>
    </Dragger>
  );
}
