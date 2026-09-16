// ImportBanner — success or preview banner for ReportStep.
// Extracted from ReportStep.tsx for DSI 200-line compliance.

import { Button, Tooltip, Typography } from "antd";
import {
  DownloadOutlined, EyeOutlined, PrinterOutlined, SafetyCertificateOutlined, SaveOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface ImportBannerProps {
  report?: Record<string, unknown> | null;
  importing?: boolean;
  handleImport: () => void;
  exportReportJson: () => void;
}

export default function ImportBanner({ report, importing, handleImport, exportReportJson }: Readonly<ImportBannerProps>) {
  if (report) {
    return (
      <div className="rice-success-card">
        <div className="rice-success-icon"><SafetyCertificateOutlined /></div>
        <div className="rice-success-text" style={{ flex: 1 }}>
          <h4>Import RICE réussi !</h4>
          <p>{report.message as string ?? "Le référentiel a été enregistré avec succès en base de données."}</p>
          {!!report.generatedAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Généré le{" "}{new Date(report.generatedAt as string).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </Text>
          )}
        </div>
        <Button icon={<PrinterOutlined />} size="small" onClick={() => globalThis.print()} style={{ flexShrink: 0, marginLeft: 8 }}>Imprimer</Button>
        <Button icon={<DownloadOutlined />} size="small" style={{ flexShrink: 0, marginLeft: 8 }} onClick={exportReportJson}>Télécharger</Button>
      </div>
    );
  }

  return (
    <div className="rice-preview-card">
      <div className="rice-preview-icon"><EyeOutlined /></div>
      <div className="rice-preview-text" style={{ flex: 1 }}>
        <h4>Mode prévisualisation</h4>
        <p>Les données ne sont pas encore enregistrées. Vérifiez le récapitulatif ci-dessous, puis cliquez sur « Enregistrer » lorsque vous êtes prêt.</p>
      </div>
      <Tooltip title="Ctrl+Enter">
        <Button type="primary" icon={<SaveOutlined />} loading={importing} onClick={handleImport} size="large" style={{ borderRadius: 10, flexShrink: 0 }}>
          Valider et importer
        </Button>
      </Tooltip>
    </div>
  );
}
