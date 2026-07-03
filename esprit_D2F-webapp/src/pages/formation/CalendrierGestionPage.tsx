import { useState, useMemo, useCallback } from "react";
import {
  Card,
  Tabs,
  Button,
  Typography,
  Statistic,
  Alert,
  Spin,
  Checkbox,
  Tag,
  message,
  Badge,
} from "antd";
import {
  CalendarOutlined,
  ImportOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  TeamOutlined,
  ExportOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAppNotification } from "@/hooks/ui/useAppNotification";
import { useAuth } from "@/hooks/auth/useAuth";
import { isAdmin } from "@/utils/constants/roles";
import {
  usePreviewImport,
  useImportCalendar,
  useCalendarConflicts,
  useCalendarFormations,
} from "@/hooks/formation/useCalendar";
import {
  CalendarFileUpload,
  ImportErrorsTable,
  ImportResultSummary,
  ConflictsTable,
  CalendarFormationsTable,
} from "@/components/calendar";
import type { ImportReport, ParsedCalendar } from "@/models/calendar";
import "../../styles/pages/calendrier-gestion.css";

const { Title, Text, Paragraph } = Typography;

export default function CalendrierGestionPage() {
  const { user } = useAuth();
  const { notificationApi } = useAppNotification();
  const admin = isAdmin(user?.role);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useType<ParsedCalendar | null>(null);
  const [report, setReport] = useType<ImportReport | null>(null);
  const [activeTab, setActiveTab] = useState("import");
  const [forceImport, setForceImport] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const previewMutation = usePreviewImport();
  const importMutation = useImportCalendar();
  const conflicts = useCalendarConflicts();
  const formations = useCalendarFormations({ page: 0, size: 1 });

  const totalFormations = formations.data?.totalElements ?? 0;
  const totalConflicts = conflicts.data?.totalConflicts ?? 0;

  const handlePreview = useCallback(
    (f: File) => {
      setFile(f);
      setCurrentStep(1);
      previewMutation.mutate(f, {
        onSuccess: (data) => {
          setPreview(data);
        },
        onError: () => {
          setPreview(null);
          setCurrentStep(0);
        },
      });
    },
    [previewMutation, setPreview]
  );

  const handleImport = useCallback(
    (f: File, force: boolean) => {
      setCurrentStep(2);
      importMutation.mutate(
        { file: f, force },
        {
          onSuccess: (data) => {
            setReport(data);
            setPreview(null);
            formations.refetch();
            conflicts.refetch();
            message.success("Import terminé avec succès");
          },
          onError: (err) => {
            if (err.response?.status === 409) {
              notificationApi.warning({
                message: "Conflits détectés",
                description:
                  "Des doublons ont été trouvés. Utilisez « Forcer l'import » pour ignorer.",
              });
            }
            setReport(null);
            setCurrentStep(1);
          },
        }
      );
    },
    [importMutation, notificationApi, formations, conflicts]
  );

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setReport(null);
    setForceImport(false);
    setCurrentStep(0);
  }, []);

  const tabItems = useMemo(
    () => [
      {
        key: "import",
        label: (
          <span className="cal-tab-label">
            <ImportOutlined />
            <span>Import Calendrier</span>
            {totalConflicts > 0 && (
              <Tag color="error" className="cal-tab-count">
                {totalConflicts}
              </Tag>
            )}
          </span>
        ),
      },
      {
        key: "formations",
        label: (
          <span className="cal-tab-label">
            <CalendarOutlined />
            <span>Formations & Export</span>
            <Tag color="processing" className="cal-tab-count">
              {totalFormations}
            </Tag>
          </span>
        ),
      },
      {
        key: "conflicts",
        label: (
          <span className="cal-tab-label">
            <WarningOutlined />
            <span>Conflits</span>
            {totalConflicts > 0 && (
              <Badge count={totalConflicts} overflowCount={99}>
                <Tag color="warning" className="cal-tab-count">
                  {totalConflicts}
                </Tag>
              </Badge>
            )}
          </span>
        ),
      },
    ],
    [totalFormations, totalConflicts]
  );

  return (
    <div className="cal-page">
      {/* Hero Section */}
      <div className="cal-hero">
        <div className="cal-hero-content">
          <div className="cal-hero-icon">
            <CalendarOutlined />
          </div>
          <div className="cal-hero-text">
            <Title level={2} className="cal-hero-title">
              Gestion du Calendrier des Ateliers
            </Title>
            <Paragraph className="cal-hero-subtitle">
              Importez le calendrier Excel des ateliers, détectez les conflits,
              exportez au format iCalendar (.ics) et envoyez les invitations par
              e-mail.
            </Paragraph>
          </div>
          {admin && (
            <div className="cal-hero-badge">
              <Badge count="Admin" style={{ backgroundColor: "#1677ff" }} />
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="cal-stats-row">
        <Card className="cal-stat-card cal-stat-card--formations" bordered={false}>
          <Statistic
            title={<span className="cal-stat-label">Total Formations</span>}
            value={totalFormations}
            prefix={<CalendarOutlined className="cal-stat-icon cal-stat-icon--formations" />}
            valueStyle={{ color: "#1677ff" }}
          />
        </Card>
        <Card className="cal-stat-card cal-stat-card--sessions" bordered={false}>
          <Statistic
            title={<span className="cal-stat-label">Séances Importées</span>}
            value={report?.sessionsCreated ?? "—"}
            prefix={<FileExcelOutlined className="cal-stat-icon cal-stat-icon--sessions" />}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card className="cal-stat-card cal-stat-card--participants" bordered={false}>
          <Statistic
            title={<span className="cal-stat-label">Participants</span>}
            value={report?.participantsCount ?? "—"}
            prefix={<TeamOutlined className="cal-stat-icon cal-stat-icon--participants" />}
            valueStyle={{ color: "#722ed1" }}
          />
        </Card>
        <Card className="cal-stat-card cal-stat-card--status" bordered={false}>
          <Statistic
            title={<span className="cal-stat-label">Statut Import</span>}
            value={
              report ? (
                report.status === "SUCCESS" ? (
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                ) : report.status === "PARTIAL" ? (
                  <WarningOutlined style={{ color: "#fa8c16" }} />
                ) : (
                  <InfoCircleOutlined style={{ color: "#ff4d4f" }} />
                )
              ) : (
                "—"
              )
            }
            prefix={
              report ? (
                <Text strong style={{ fontSize: 14 }}>
                  {report.status === "SUCCESS"
                    ? "Succès"
                    : report.status === "PARTIAL"
                    ? "Partiel"
                    : report.status === "FAILED"
                    ? "Échoué"
                    : report.status === "DUPLICATE"
                    ? "Doublon"
                    : "—"}
                </Text>
              ) : (
                "En attente"
              )
            }
          />
        </Card>
      </div>

      {/* Main Content */}
      <div className="cal-content">
        <Card className="cal-tabs-card" bordered={false}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="cal-tabs"
          />

          {/* Import Tab */}
          {activeTab === "import" && (
            <div className="cal-import-section">
              {!admin && (
                <Alert
                  message="Accès limité"
                  description="Vous avez un accès en lecture seule. Seuls les administrateurs peuvent importer des calendriers."
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined />}
                  className="cal-alert"
                />
              )}

              {/* Step 0: Upload */}
              {currentStep === 0 && (
                <div className="cal-step-content">
                  <CalendarFileUpload
                    onFileSelected={handlePreview}
                    loading={previewMutation.isPending}
                    disabled={!admin}
                  />
                </div>
              )}

              {/* Step 1: Preview */}
              {currentStep === 1 && preview && (
                <div className="cal-step-content">
                  <Card className="cal-preview-card" title="Aperçu du fichier">
                    <div className="cal-preview-stats">
                      <Tag icon={<FileExcelOutlined />} color="processing">
                        {preview.formations.length} formations
                      </Tag>
                      <Tag icon={<CalendarOutlined />} color="cyan">
                        {preview.sessionsCount} séances
                      </Tag>
                      <Tag icon={<TeamOutlined />} color="purple">
                        {preview.participantsCount} participants
                      </Tag>
                    </div>

                    <div className="cal-preview-table">
                      <table className="cal-preview-table-inner">
                        <thead>
                          <tr>
                            <th>Formation</th>
                            <th>Date</th>
                            <th>Salle</th>
                            <th>Participants</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.formations.slice(0, 10).map((f, i) => (
                            <tr key={i}>
                              <td>{f.titre}</td>
                              <td>
                                {f.dateDebut
                                  ? new Date(f.dateDebut).toLocaleDateString("fr-FR")
                                  : "—"}
                              </td>
                              <td>{f.salle || "—"}</td>
                              <td>{f.participants?.length ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {preview.formations.length > 10 && (
                        <Text type="secondary" className="cal-preview-more">
                          +{preview.formations.length - 10} autres formations...
                        </Text>
                      )}
                    </div>

                    <div className="cal-preview-actions">
                      <Button onClick={handleReset}>Annuler</Button>
                      <Button
                        type="primary"
                        icon={<ImportOutlined />}
                        onClick={() => file && handleImport(file, false)}
                        loading={importMutation.isPending}
                        disabled={!admin}
                      >
                        Importer
                      </Button>
                      <Checkbox
                        checked={forceImport}
                        onChange={(e) => setForceImport(e.target.checked)}
                        disabled={!admin}
                      >
                        Forcer l'import (ignorer les doublons)
                      </Checkbox>
                    </div>
                  </Card>
                </div>
              )}

              {/* Step 1: Loading */}
              {currentStep === 1 && previewMutation.isPending && (
                <div className="cal-step-content cal-loading">
                  <Spin size="large" tip="Analyse du fichier..." />
                </div>
              )}

              {/* Step 2: Result */}
              {currentStep === 2 && report && (
                <div className="cal-step-content">
                  <ImportResultSummary report={report} />
                  <div className="cal-result-actions">
                    <Button onClick={handleReset}>
                      Nouveau Import
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formations Tab */}
          {activeTab === "formations" && (
            <div className="cal-formations-section">
              <div className="cal-section-header">
                <Title level={4}>Calendrier des Formations</Title>
                <div className="cal-section-actions">
                  <Button icon={<ExportOutlined />}>Exporter .ics</Button>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Nouvelle Formation
                  </Button>
                </div>
              </div>
              <CalendarFormationsTable />
            </div>
          )}

          {/* Conflicts Tab */}
          {activeTab === "conflicts" && (
            <div className="cal-conflicts-section">
              <div className="cal-section-header">
                <Title level={4}>Conflits Détectés</Title>
              </div>
              <ConflictsTable
                report={conflicts.data}
                loading={conflicts.isFetching}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function useType<T>(initial: T) {
  return useState<T>(initial);
}