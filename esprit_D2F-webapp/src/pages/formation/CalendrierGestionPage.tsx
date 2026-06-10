import { useState } from "react";
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
} from "antd";
import {
  EyeOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  MailOutlined,
  CalendarOutlined,
  WarningOutlined,
  ImportOutlined,
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

const { Title, Paragraph } = Typography;

export default function CalendrierGestionPage() {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const admin = isAdmin(user?.role);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCalendar | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const previewMutation = usePreviewImport();
  const importMutation = useImportCalendar();
  const sendAll = useSendAllInvitations();
  const conflicts = useCalendarConflicts();

  const handlePreview = () => {
    if (!file) return;
    setReport(null);
    previewMutation.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        message.success(`${data.sessions.length} séance(s) détectée(s).`);
      },
      onError: () => message.error("Impossible d'analyser le fichier."),
    });
  };

  const handleImport = () => {
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
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      await CalendarService.downloadIcsAll();
    } catch {
      message.error("Échec du téléchargement du calendrier complet.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleSendAll = () => {
    sendAll.mutate(undefined, {
      onSuccess: (result) => message.success(result.message),
      onError: () => message.error("Échec de l'envoi global des invitations."),
    });
  };

  const importTab = (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {!admin && (
        <Alert
          type="info"
          showIcon
          message="L'import et l'envoi d'invitations sont réservés aux administrateurs."
        />
      )}
      <CalendarFileUpload
        file={file}
        onFileChange={(f) => {
          setFile(f);
          setPreview(null);
          setReport(null);
        }}
        disabled={previewMutation.isPending || importMutation.isPending}
      />

      <Space>
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
          Importer
        </Button>
      </Space>

      {preview && <PreviewPanel preview={preview} />}
      {report && <ImportResultSummary report={report} />}
    </Space>
  );

  const exportTab = (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space wrap>
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
      </Space>
      <CalendarFormationsTable canSendInvitations={admin} />
    </Space>
  );

  const tabs = [
    {
      key: "import",
      label: (
        <span>
          <ImportOutlined /> Import
        </span>
      ),
      children: importTab,
    },
    {
      key: "export",
      label: (
        <span>
          <CalendarOutlined /> Formations & Export
        </span>
      ),
      children: exportTab,
    },
    {
      key: "conflicts",
      label: (
        <span>
          <WarningOutlined /> Conflits
        </span>
      ),
      children: <ConflictsTable report={conflicts.data} loading={conflicts.isFetching} />,
    },
  ];

  return (
    <Card>
      <Title level={3}>
        <CalendarOutlined /> Gestion du calendrier des ateliers
      </Title>
      <Paragraph type="secondary">
        Importez le calendrier Excel des ateliers, détectez les conflits, exportez au format
        iCalendar (.ics) compatible Outlook / Google / Apple, et envoyez les invitations par e-mail.
      </Paragraph>
      <Tabs defaultActiveKey="import" items={tabs} />
    </Card>
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
    <Card type="inner" title="Aperçu (non enregistré)">
      <Row gutter={16}>
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
