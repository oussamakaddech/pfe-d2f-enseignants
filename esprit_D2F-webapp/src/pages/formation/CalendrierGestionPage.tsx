import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Space,
  Statistic,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  ImportOutlined,
  ReloadOutlined,
  SaveOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { AxiosError } from 'axios';
import useAppNotification from '@/hooks/ui/useAppNotification';
import {
  useCalendarConflicts,
  useCalendarFormations,
  useImportCalendar,
  usePreviewImport,
} from '@/hooks/formation/useCalendar';
import {
  CalendarFileUpload,
  CalendarFormationsTable,
  ConflictsTable,
  ImportErrorsTable,
  ImportResultSummary,
} from '@/components/calendar';
import type { ImportReport, ParsedCalendar, ParsedSession } from '@/models/calendar';
import '../../styles/pages/calendrier-gestion.css';

const { Title, Paragraph, Text } = Typography;

const STEP_FICHIER = 0;
const STEP_APERCU = 1;
const STEP_RESULTAT = 2;

const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function formatDate(d?: string): string {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('fr-FR');
}

function horaire(s: ParsedSession): string {
  if (!s.startTime && !s.endTime) return '—';
  return `${(s.startTime ?? '').slice(0, 5)} – ${(s.endTime ?? '').slice(0, 5)}`;
}

/**
 * Gestion du calendrier des ateliers (ADMIN) :
 *  1. choisir le fichier Excel, 2. vérifier l'aperçu (aucune écriture),
 *  3. « Enregistrer le calendrier » (seule étape qui écrit en base),
 *  puis consulter / exporter les formations et les conflits.
 */
export default function CalendrierGestionPage() {
  const { message, notification, modal } = useAppNotification();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedCalendar | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  // Dernier enregistrement réussi : conservé pour les tuiles même après « Nouvel import ».
  const [dernierImport, setDernierImport] = useState<ImportReport | null>(null);
  const [step, setStep] = useState(STEP_FICHIER);
  const [ignorerDoublons, setIgnorerDoublons] = useState(false);
  const [doublonDetecte, setDoublonDetecte] = useState(false);
  const [activeTab, setActiveTab] = useState('import');

  const previewMutation = usePreviewImport();
  const importMutation = useImportCalendar();
  const conflicts = useCalendarConflicts();
  const formations = useCalendarFormations({ page: 0, size: 1 });

  const totalFormations = formations.data?.totalElements ?? 0;
  const totalConflicts = conflicts.data?.totalConflicts ?? 0;

  // ── Synthèse de l'aperçu ─────────────────────────────────────────────
  const apercu = useMemo(() => {
    if (!preview) return null;
    const participantsParFormation = new Map<string, number>();
    preview.participants.forEach((p) => {
      const key = normaliser(p.formationName);
      participantsParFormation.set(key, (participantsParFormation.get(key) ?? 0) + 1);
    });
    const nbFormations = new Set(preview.sessions.map((s) => normaliser(s.formationName))).size;
    const erreurs = preview.errors.filter((e) => e.severity === 'ERROR').length;
    return {
      participantsParFormation,
      nbFormations,
      nbSeances: preview.sessions.length,
      nbParticipants: new Set(preview.participants.map((p) => p.email.toLowerCase())).size,
      erreurs,
      avertissements: preview.errors.length - erreurs,
    };
  }, [preview]);

  const reinitialiser = () => {
    setFile(null);
    setPreview(null);
    setReport(null);
    setIgnorerDoublons(false);
    setDoublonDetecte(false);
    setStep(STEP_FICHIER);
  };

  const analyser = (f: File | null) => {
    if (!f) {
      reinitialiser();
      return;
    }
    setFile(f);
    setPreview(null);
    setDoublonDetecte(false);
    previewMutation.mutate(f, {
      onSuccess: (data) => {
        setPreview(data);
        setStep(STEP_APERCU);
      },
      onError: () => {
        message.error(
          'Analyse impossible : vérifiez que le fichier respecte le format du calendrier.',
        );
      },
    });
  };

  const enregistrer = (force: boolean) => {
    if (!file) return;
    importMutation.mutate(
      { file, force },
      {
        onSuccess: (data) => {
          // Fichier déjà importé : on reste sur l'aperçu sans écraser le dernier rapport.
          if (data.status === 'DUPLICATE') {
            setDoublonDetecte(true);
            return;
          }
          setReport(data);
          setDernierImport(data);
          setStep(STEP_RESULTAT);
          formations.refetch();
          conflicts.refetch();
          if (data.sessionsCreated === 0 && data.rowsSkipped > 0) {
            message.info('Calendrier déjà à jour : aucune nouvelle séance.');
          } else if (data.status === 'SUCCESS') {
            message.success('Calendrier enregistré.');
          } else if (data.status === 'PARTIAL') {
            message.warning('Calendrier enregistré partiellement : consultez les erreurs.');
          } else {
            message.error("L'enregistrement a échoué : consultez les erreurs.");
          }
        },
        onError: (err: unknown) => {
          const status = (err as AxiosError).response?.status;
          if (status === 409) {
            setDoublonDetecte(true);
            return;
          }
          notification.error({
            message: 'Enregistrement impossible',
            description:
              ((err as AxiosError<{ message?: string }>).response?.data?.message as string) ??
              'Réessayez plus tard.',
          });
        },
      },
    );
  };

  const confirmerEnregistrement = () => {
    if (!apercu) return;
    modal.confirm({
      title: 'Enregistrer le calendrier ?',
      icon: <SaveOutlined />,
      content: (
        <div>
          <p>
            {apercu.nbFormations} formation(s), {apercu.nbSeances} séance(s) et{' '}
            {apercu.nbParticipants} participant(s) vont être enregistrés.
          </p>
          {apercu.erreurs > 0 && (
            <p>
              <Text type="danger">{apercu.erreurs} ligne(s) en erreur seront ignorées.</Text>
            </p>
          )}
          {ignorerDoublons && <p>Les doublons d'un import précédent seront ignorés.</p>}
        </div>
      ),
      okText: 'Enregistrer',
      cancelText: 'Annuler',
      onOk: () => enregistrer(ignorerDoublons),
    });
  };

  // ── Colonnes de l'aperçu ─────────────────────────────────────────────
  const colonnesApercu: ColumnsType<ParsedSession> = [
    { title: 'Ligne', dataIndex: 'sourceRow', width: 70, align: 'center' },
    { title: 'Formation', dataIndex: 'formationName', ellipsis: true },
    {
      title: 'Séance',
      width: 90,
      align: 'center',
      render: (_, s) => (s.sessionNumber ? `${s.sessionNumber}/${s.totalSessions ?? '?'}` : '—'),
    },
    { title: 'Date', dataIndex: 'date', width: 110, render: (d?: string) => formatDate(d) },
    { title: 'Horaire', width: 120, render: (_, s) => horaire(s) },
    { title: 'Salle', dataIndex: 'room', width: 110, render: (v?: string) => v || '—' },
    {
      title: 'Animateur',
      dataIndex: 'trainerName',
      ellipsis: true,
      render: (v?: string) => v || '—',
    },
    {
      title: 'Participants',
      width: 110,
      align: 'center',
      render: (_, s) => apercu?.participantsParFormation.get(normaliser(s.formationName)) ?? 0,
    },
  ];

  const etapes = [
    { title: 'Fichier', description: 'Choisir le .xlsx' },
    { title: 'Aperçu et vérification', description: 'Aucune écriture' },
    { title: 'Enregistrement', description: 'Calendrier enregistré' },
  ];

  const ongletImport = (
    <div className="cal-import-section">
      <Steps current={step} items={etapes} className="cal-steps" />

      {step === STEP_FICHIER && (
        <div className="cal-step-content">
          <CalendarFileUpload
            file={file}
            onFileChange={analyser}
            loading={previewMutation.isPending}
          />
          {previewMutation.isPending && (
            <Alert
              type="info"
              showIcon
              message="Analyse du fichier en cours…"
              className="cal-alert"
            />
          )}
          <Paragraph type="secondary" className="cal-hint">
            L'analyse ne modifie rien : les données ne sont enregistrées qu'après avoir cliqué sur «
            Enregistrer le calendrier ».
          </Paragraph>
        </div>
      )}

      {step === STEP_APERCU && preview && apercu && (
        <div className="cal-step-content">
          <Space wrap className="cal-preview-stats">
            <Tag icon={<CalendarOutlined />} color="processing">
              {apercu.nbFormations} formation(s)
            </Tag>
            <Tag icon={<FileExcelOutlined />} color="cyan">
              {apercu.nbSeances} séance(s)
            </Tag>
            <Tag icon={<TeamOutlined />} color="purple">
              {apercu.nbParticipants} participant(s)
            </Tag>
            {apercu.erreurs > 0 && (
              <Tag icon={<WarningOutlined />} color="error">
                {apercu.erreurs} erreur(s)
              </Tag>
            )}
            {apercu.avertissements > 0 && (
              <Tag icon={<WarningOutlined />} color="warning">
                {apercu.avertissements} avertissement(s)
              </Tag>
            )}
          </Space>

          {doublonDetecte && (
            <Alert
              type="warning"
              showIcon
              className="cal-alert"
              message="Ce fichier a déjà été importé"
              description="Cochez « Ignorer les doublons » puis enregistrez à nouveau pour forcer l'import."
            />
          )}
          {apercu.nbSeances === 0 && (
            <Alert
              type="error"
              showIcon
              className="cal-alert"
              message="Aucune séance lue dans ce fichier"
              description="Vérifiez la feuille « Calendrier » et sa ligne d'en-tête (Formation, Formateur, Salle, Horaire…)."
            />
          )}

          <Table<ParsedSession>
            size="small"
            rowKey={(s) => `${s.sourceRow}-${s.formationName}`}
            columns={colonnesApercu}
            dataSource={preview.sessions}
            pagination={{ pageSize: 10, showSizeChanger: true, hideOnSinglePage: true }}
            scroll={{ x: 'max-content' }}
          />

          {preview.errors.length > 0 && (
            <Card size="small" title="Lignes à vérifier" className="cal-errors-card">
              <ImportErrorsTable errors={preview.errors} />
            </Card>
          )}

          <div className="cal-preview-actions">
            <Checkbox
              checked={ignorerDoublons}
              onChange={(e) => setIgnorerDoublons(e.target.checked)}
            >
              Ignorer les doublons (fichier déjà importé)
            </Checkbox>
            <Space>
              <Button onClick={reinitialiser}>Annuler</Button>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={importMutation.isPending}
                disabled={apercu.nbSeances === 0}
                onClick={confirmerEnregistrement}
              >
                Enregistrer le calendrier
              </Button>
            </Space>
          </div>
        </div>
      )}

      {step === STEP_RESULTAT && report && (
        <div className="cal-step-content">
          {report.sessionsCreated === 0 && report.rowsSkipped > 0 && (
            <Alert
              type="info"
              showIcon
              className="cal-alert"
              message="Aucune nouvelle séance"
              description="Toutes les séances de ce fichier étaient déjà enregistrées : rien n'a été ajouté."
            />
          )}
          <ImportResultSummary report={report} />
          <div className="cal-result-actions">
            <Button icon={<ImportOutlined />} onClick={reinitialiser}>
              Nouvel import
            </Button>
            <Button
              type="primary"
              icon={<CalendarOutlined />}
              onClick={() => setActiveTab('formations')}
            >
              Voir les formations
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'import',
      label: (
        <span className="cal-tab-label">
          <ImportOutlined /> Import du calendrier
        </span>
      ),
      children: ongletImport,
    },
    {
      key: 'formations',
      label: (
        <span className="cal-tab-label">
          <CalendarOutlined /> Formations et export
          <Tag color="processing" className="cal-tab-count">
            {totalFormations}
          </Tag>
        </span>
      ),
      children: (
        <div className="cal-formations-section">
          <div className="cal-section-header">
            <Title level={4}>Formations du calendrier</Title>
          </div>
          <Paragraph type="secondary" className="cal-hint">
            Seules les formations extraites d&apos;un fichier .xlsx importé sont listées ; les
            formations saisies dans l&apos;application n&apos;apparaissent pas ici.
          </Paragraph>
          <CalendarFormationsTable />
        </div>
      ),
    },
    {
      key: 'conflicts',
      label: (
        <span className="cal-tab-label">
          <WarningOutlined /> Conflits
          {totalConflicts > 0 && (
            <Tag color="warning" className="cal-tab-count">
              {totalConflicts}
            </Tag>
          )}
        </span>
      ),
      children: (
        <div className="cal-conflicts-section">
          <div className="cal-section-header">
            <Title level={4}>Conflits détectés</Title>
            <Button
              icon={<ReloadOutlined />}
              loading={conflicts.isFetching}
              onClick={() => conflicts.refetch()}
            >
              Actualiser
            </Button>
          </div>
          <ConflictsTable report={conflicts.data} loading={conflicts.isFetching} />
        </div>
      ),
    },
  ];

  return (
    <div className="cal-page">
      <div className="cal-hero">
        <div className="cal-hero-content">
          <div className="cal-hero-icon">
            <CalendarOutlined />
          </div>
          <div className="cal-hero-text">
            <Title level={2} className="cal-hero-title">
              Gestion du calendrier des ateliers
            </Title>
            <Paragraph className="cal-hero-subtitle">
              Importez le calendrier Excel, vérifiez l'aperçu, enregistrez-le, puis exportez les
              séances au format iCalendar (.ics).
            </Paragraph>
          </div>
        </div>
      </div>

      <div className="cal-stats-row">
        <Card className="cal-stat-card" variant="borderless">
          <Statistic
            title={<span className="cal-stat-label">Formations du calendrier</span>}
            value={totalFormations}
            loading={formations.isLoading}
            prefix={<CalendarOutlined className="cal-stat-icon cal-stat-icon--formations" />}
          />
        </Card>
        <Card className="cal-stat-card" variant="borderless">
          <Statistic
            title={<span className="cal-stat-label">Conflits détectés</span>}
            value={totalConflicts}
            loading={conflicts.isLoading}
            prefix={<WarningOutlined className="cal-stat-icon cal-stat-icon--participants" />}
          />
        </Card>
        <Card className="cal-stat-card" variant="borderless">
          <Statistic
            title={<span className="cal-stat-label">Séances du dernier import</span>}
            value={dernierImport?.sessionsCreated ?? '—'}
            prefix={<FileExcelOutlined className="cal-stat-icon cal-stat-icon--sessions" />}
          />
        </Card>
        <Card className="cal-stat-card" variant="borderless">
          <Statistic
            title={<span className="cal-stat-label">Participants du dernier import</span>}
            value={dernierImport?.participantsImported ?? '—'}
            prefix={<CheckCircleOutlined className="cal-stat-icon cal-stat-icon--status" />}
          />
        </Card>
      </div>

      <div className="cal-content">
        <Card className="cal-tabs-card" variant="borderless">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="cal-tabs"
          />
        </Card>
      </div>
    </div>
  );
}
