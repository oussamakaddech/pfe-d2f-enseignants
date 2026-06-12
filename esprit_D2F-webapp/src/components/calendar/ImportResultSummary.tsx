import { Card, Col, Row, Statistic, Tag, Alert, Divider, Typography } from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  TeamOutlined,
  WarningOutlined,
  StopOutlined,
  DisconnectOutlined,
} from "@ant-design/icons";
import type { ImportReport, ImportStatus } from "@/models/calendar";
import ImportErrorsTable from "./ImportErrorsTable";

const { Text } = Typography;

const STATUS_META: Record<ImportStatus, { color: string; label: string }> = {
  SUCCESS: { color: "success", label: "Import réussi" },
  PARTIAL: { color: "warning", label: "Import partiel" },
  FAILED: { color: "error", label: "Import échoué" },
  DUPLICATE: { color: "default", label: "Fichier déjà importé" },
};

interface Props {
  report: ImportReport;
}

/** Récapitulatif d'un import : statut, compteurs et erreurs. */
export default function ImportResultSummary({ report }: Readonly<Props>) {
  const meta = STATUS_META[report.status] ?? STATUS_META.PARTIAL;

  return (
    <Card
      title={
        <span>
          Résultat de l'import {report.fileName ? <Text type="secondary">— {report.fileName}</Text> : null}
        </span>
      }
      extra={<Tag color={meta.color}>{meta.label}</Tag>}
    >
      {report.status === "DUPLICATE" && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Ce fichier a déjà été importé"
          description={
            report.duplicateOfImportId
              ? `Import existant n° ${report.duplicateOfImportId}. Aucune donnée n'a été dupliquée.`
              : "Aucune donnée n'a été dupliquée."
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={4}>
          <Statistic title="Formations" value={report.formationsCreated} prefix={<ReadOutlined />} />
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Statistic title="Séances" value={report.sessionsCreated} prefix={<CalendarOutlined />} />
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Statistic title="Participants" value={report.participantsImported} prefix={<TeamOutlined />} />
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Statistic
            title="Non rattachés"
            value={report.participantsUnmatched}
            prefix={<DisconnectOutlined />}
            valueStyle={report.participantsUnmatched > 0 ? { color: "#d46b08" } : undefined}
          />
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Statistic
            title="Lignes ignorées"
            value={report.rowsSkipped}
            prefix={<StopOutlined />}
            valueStyle={report.rowsSkipped > 0 ? { color: "#d46b08" } : undefined}
          />
        </Col>
        <Col xs={12} md={8} lg={4}>
          <Statistic
            title="Conflits"
            value={report.conflictsDetected}
            prefix={<WarningOutlined />}
            valueStyle={report.conflictsDetected > 0 ? { color: "#cf1322" } : undefined}
          />
        </Col>
      </Row>

      {report.errors && report.errors.length > 0 && (
        <>
          <Divider orientation="left">Détails des problèmes ({report.errors.length})</Divider>
          <ImportErrorsTable errors={report.errors} />
        </>
      )}
    </Card>
  );
}
