import { useState, useMemo, useCallback } from "react";
import {
  Card,
  Tabs,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Divider,
  Alert,
  Spin,
} from "antd";
import {
  EyeOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  MailOutlined,
  CalendarOutlined,
  WarningOutlined,
  ImportOutlined,
  ExportOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useAuth } from "@/hooks/auth/useAuth";
import { isAdmin } from "@/utils/constants/roles";
import {
  usePreviewImport,
  useImportCalendar,
  useCalendarConflicts,
  useSendAllInvitations,
  useCalendarFormations,
} from "@/hooks/formation/useCalendar";
import CalendarService from "@/services/formation/CalendarService";
import {
  CalendarFileUpload,
  ImportErrorsTable,
  ImportResultSummary,
  ConflictsTable,
  CalendarFormationsTable,
} from "@/components/calendar";
import type { ImportReport, ParsedCalendar, ParsedSession } from "@/models/calendar";
import "@/styles/pages/calendrier-gestion.css";

const { Title, Paragraph, Text } = Typography;

export default function CalendrierGestionPage() {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const admin = isAdmin(user?.role);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCalendar | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [activeTab, setActiveTab] = useState("import");

  const previewMutation = usePreviewImport();
  const importMutation = useImportCalendar();
  const sendAll = useSendAllInvitations();
  const conflicts = useCalendarConflicts();
  const { data: formationsData } = useCalendarFormations({ page: 0, size: 1 });

  const conflictCount = conflicts.data?.totalConflicts ?? 0;
  const formationsTotal = formationsData?.totalElements ?? 0;

  const handlePreview = useCallback(() => {
    if (!file) return;
    setReport(null);
    previewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        message.success(`${data.sessions.length} séance(s) détectée(s).`);
      },
      onError: () => message.error("Impossible d'analyser le fichier."),
    });
  }, [file, previewMutation, message]);

  const handleImport = useCallback(() => {
    if (!file) return;
    setPreview(null);
    importMutation.mutate(file, {
      onSuccess: (data) => {
        setReport(data);
        conflicts.refetch();
        if (data.status === "DUPLICATE") {
          message.info("Ce fichier a déjà été importé.");
        } else if (data.status === "FAILED") {
          message.error("L'import a échoué — consultez les erreurs.");
        } else {
          message.success("Import terminé.");
        }
      },
      onError: () => message.error("Échec de l'import."),
    });
  }, [file, importMutation, conflicts, message]);

  const handleDownloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      await CalendarService.downloadIcsAll();
    } catch {
      message.error("Échec du téléchargement du calendrier complet.");
    } finally {
      setDownloadingAll(false);
    }
  }, [message]);

  const handleSendAll = useCallback(() => {
    sendAll.mutate(undefined, {
      onSuccess: (result) => message.success(result.message),
      onError: () => message.error("Échec de l'envoi global des invitations."),
    });
  }, [sendAll, message]);

  const importTab = useMemo(
    () => (
      <div className="cal-gestion-import-section">
        {!admin && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Droits restreints"
            description="L'import et l'envoi d'invitations sont réservés aux administrateurs. Vous pouvez consulter les formations et exporter le calendrier."
          />
        )}
        <div className="cal-gestion-upload-wrapper">
          <CalendarFileUpload
            file={file}
            onFileChange={(f) => {
              setFile(f);
              setPreview(null);
              setReport(null);
            }}
            disabled={previewMutation.isPending || importMutation.isPending}
          />
        </div>

        <div className="cal-gestion-actions">
          <Button
            icon={<EyeOutlined />}
            disabled={!file || !admin}
            loading={previewMutation.isPending}
            onClick={handlePreview}
          >
            Aperçu
          </Button>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            disabled={!file || !admin}
            loading={importMutation.isPending}
            onClick={handleImport}
          >
            Importer dans le calendrier
          </Button>
          {!file && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              Sélectionnez un fichier .xlsx pour commencer
            </Text>
          )}
        </div>

        {preview && <PreviewPanel preview={preview} />}
        {report && <ImportResultSummary report={report} />}
      </div>
    ),
    [file, preview, report, admin, previewMutation.isPending, importMutation.isPending, handlePreview, handleImport]
  );

  const exportTab = useMemo(
    () => (
      <div className="cal-gestion-export-section">
        <div className="cal-gestion-export-actions">
          <Button
            icon={<DownloadOutlined />}
            loading={downloadingAll}
            onClick={handleDownloadAll}
          >
            Télécharger tout le calendrier (.ics)
          </Button>
          {admin && (
            <Button
              type="primary"
              ghost
              icon={<MailOutlined />}
              loading={sendAll.isPending}
              onClick={handleSendAll}
            >
              Envoyer toutes les invitations
            </Button>
          )}
        </div>
        <CalendarFormationsTable canSendInvitations={admin} />
      </div>
    ),
    [downloadingAll, admin, sendAll.isPending, handleDownloadAll, handleSendAll]
  );

  const tabs = useMemo(
    () => [
      {
        key: "import",
        label: (
          <span>
            <ImportOutlined style={{ marginRight: 6 }} />
            Import
          </span>
        ),
        children: importTab,
      },
      {
        key: "export",
        label: (
          <span>
            <ExportOutlined style={{ marginRight: 6 }} />
            Formations & Export
            {formationsTotal > 0 && (
              <span className="cal-gestion-tab-badge cal-gestion-tab-badge--success">
                {formationsTotal}
              </span>
            )}
          </span>
        ),
        children: exportTab,
      },
      {
        key: "conflicts",
        label: (
          <span>
            <WarningOutlined style={{ marginRight: 6 }} />
            Conflits
            {conflictCount > 0 && (
              <span className="cal-gestion-tab-badge cal-gestion-tab-badge--danger">
                {conflictCount}
              </span>
            )}
          </span>
        ),
        children: <ConflictsTable report={conflicts.data} loading={conflicts.isFetching} />,
      },
    ],
    [importTab, exportTab, formationsTotal, conflictCount, conflicts.data, conflicts.isFetching]
  );

  return (
    <div className="cal-gestion-page">
      {/* Hero Banner */}
      <div className="cal-gestion-hero">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <Title level={3} className="cal-gestion-hero-title">
              <CalendarOutlined style={{ marginRight: 10, WebkitTextFillColor: "#2563eb" }} />
              Gestion du calendrier des ateliers
            </Title>
            <Paragraph className="cal-gestion-hero-subtitle">
              Importez le calendrier Excel des ateliers, détectez les conflits, exportez au format
              iCalendar (.ics) compatible Outlook / Google / Apple, et envoyez les invitations par e-mail.
            </Paragraph>
          </div>
          {admin && (
            <span className="cal-gestion-tab-badge cal-gestion-tab-badge--success" style={{ fontSize: 13, padding: "6px 16px", alignSelf: "center" }}>
              <CheckCircleOutlined style={{ marginRight: 6 }} />
              Mode administrateur
            </span>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="cal-gestion-stats">
        <div className="cal-gestion-stat-card cal-gestion-stat-card--import">
          <div className="cal-gestion-stat-icon cal-gestion-stat-icon--import">
            <FileExcelOutlined />
          </div>
          <div className="cal-gestion-stat-label">Import</div>
          <div className="cal-gestion-stat-value" style={{ color: "#7c3aed" }}>
            {file ? "1" : "—"}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {file ? "Fichier prêt" : "Aucun fichier"}
          </Text>
        </div>
        <div className="cal-gestion-stat-card cal-gestion-stat-card--export">
          <div className="cal-gestion-stat-icon cal-gestion-stat-icon--export">
            <ExportOutlined />
          </div>
          <div className="cal-gestion-stat-label">Formations</div>
          <div className="cal-gestion-stat-value" style={{ color: "#0891b2" }}>
            {formationsTotal}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Planifiées
          </Text>
        </div>
        <div className="cal-gestion-stat-card cal-gestion-stat-card--conflict">
          <div className="cal-gestion-stat-icon cal-gestion-stat-icon--conflict">
            <WarningOutlined />
          </div>
          <div className="cal-gestion-stat-label">Conflits</div>
          <div className="cal-gestion-stat-value" style={{ color: conflictCount > 0 ? "#dc2626" : "#10b981" }}>
            {conflictCount}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {conflictCount === 0 ? "Aucun conflit" : "À résoudre"}
          </Text>
        </div>
        <div className="cal-gestion-stat-card cal-gestion-stat-card--formations">
          <div className="cal-gestion-stat-icon cal-gestion-stat-icon--formations">
            <CalendarOutlined />
          </div>
          <div className="cal-gestion-stat-label">Statut</div>
          <div className="cal-gestion-stat-value" style={{ color: "#059669", fontSize: 22 }}>
            {conflicts.isFetching ? (
              <Spin size="small" />
            ) : conflictCount === 0 ? (
              "OK"
            ) : (
              "⚠️"
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Calendrier
          </Text>
        </div>
      </div>

      {/* Tabs Card */}
      <div className="cal-gestion-tabs-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
        />
      </div>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: ParsedCalendar }) {
  const columns: ColumnsType<ParsedSession> = [
    { title: "Formation", dataIndex: "formationName", ellipsis: true },
    { title: "Date", dataIndex: "date", width: 110, render: (v?: string) => v || "—" },
    {
      title: "Créneau",
      width: 130,
      render: (_, r) => (r.startTime ? `${r.startTime} – ${r.endTime ?? ""}` : "—"),
    },
    {
      title: "Séance",
      width: 90,
      render: (_, r) =>
        r.sessionNumber && r.totalSessions ? `${r.sessionNumber}/${r.totalSessions}` : "—",
    },
    { title: "Salle", dataIndex: "room", width: 110, render: (v?: string) => v || "—" },
    { title: "Statut", dataIndex: "status", width: 100, render: (v?: string) => v || "—" },
  ];

  return (
    <Card
      type="inner"
      title="Aperçu (non enregistré)"
      className="cal-gestion-preview-card"
    >
      <Row gutter={[16, 16]}>
        <Col xs={8}>
          <Statistic title="Séances" value={preview.sessions.length} />
        </Col>
        <Col xs={8}>
          <Statistic title="Participants" value={preview.participants.length} />
        </Col>
        <Col xs={8}>
          <Statistic
            title="Problèmes"
            value={preview.errors.length}
            valueStyle={preview.errors.length > 0 ? { color: "#cf1322" } : undefined}
          />
        </Col>
      </Row>

      <Divider orientation="left">Séances</Divider>
      <Table<ParsedSession>
        size="small"
        rowKey={(r) => `${r.sourceRow}-${r.formationName}`}
        columns={columns}
        dataSource={preview.sessions}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
      />

      {preview.errors.length > 0 && (
        <>
          <Divider orientation="left">Problèmes détectés</Divider>
          <ImportErrorsTable errors={preview.errors} />
        </>
      )}
    </Card>
  );
}