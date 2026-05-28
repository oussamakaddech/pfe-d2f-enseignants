import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Alert,
  Tooltip,
  Divider,
  Space,
} from "antd";
import {
  DownloadOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  TrophyOutlined,
  WarningOutlined,
  MailOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { TeacherSkillPassportDTO, SkillGapSummaryDTO, TrainingHistoryDTO, CertificationSummaryDTO, RecommendationSummaryDTO } from "@/models/certificat";
import { useMyPassportData, usePassportDataByUsername, useDownloadMyPassport, useDownloadPassportByUsername } from "@/hooks/certificat/useSkillPassport";
import { AppPageHeader, brand, neutral, shadow, radius } from "@/components/common";
import "@/styles/pages/skill-passport-page.css";
import s from "./SkillPassportPage.module.css";

const { Title, Text, Paragraph } = Typography;

interface Props {
  /** Si fourni, affiche le passeport d'un autre enseignant (admin/CUP). */
  readonly targetUsername?: string;
  /** Libellé affiché sur le bouton de téléchargement. */
  readonly downloadLabel?: string;
}

/**
 * Page Passeport de Compétences.
 * Usage enseignant  : <SkillPassportPage />
 * Usage admin/CUP   : <SkillPassportPage targetUsername="jdoe" downloadLabel="Télécharger le passeport" />
 */
export default function SkillPassportPage({ targetUsername, downloadLabel }: Props) {
  const myQuery = useMyPassportData();
  const targetQuery = usePassportDataByUsername(targetUsername);
  const downloadMutation = useDownloadMyPassport();
  const downloadByUsernameMutation = useDownloadPassportByUsername();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const query = targetUsername ? targetQuery : myQuery;
  const passport = query.data ?? null;
  const loading = query.isLoading;
  const queryError = query.error
    ? (query.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (query.error as { message?: string })?.message ?? "Impossible de charger les données du passeport."
    : null;
  const error = downloadError ?? queryError;
  const fetchPassport = query.refetch;

  const handleDownloadPdf = async () => {
    setDownloadLoading(true);
    try {
      if (targetUsername) {
        await downloadByUsernameMutation.mutateAsync(targetUsername);
      } else {
        await downloadMutation.mutateAsync();
      }
    } catch {
      setDownloadError("Échec du téléchargement PDF. Veuillez réessayer.");
    } finally {
      setDownloadLoading(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────
  const scoreColor = (score: number) => {
    if (score >= 4) return "#27ae60";
    if (score >= 3) return "#e67e22";
    return "#c0392b";
  };

  const graviteColor = (gravite: string): "error" | "warning" | "success" => {
    if (gravite?.includes("lev")) return "error";
    if (gravite?.includes("moy")) return "warning";
    return "success";
  };

  const statutTag = (statut: string) => {
    const map: Record<string, { color: string; label: string }> = {
      maîtrisé:       { color: "green",  label: "Maîtrisé" },
      en_progression:  { color: "orange", label: "En progression" },
      à_risque:        { color: "red",    label: "À risque" },
    };
    const s = map[statut] ?? { color: "default", label: statut };
    return <Tag color={s.color}>{s.label}</Tag>;
  };

  // ── Colonnes tableaux ────────────────────────────────────────────────
  const gapColumns = [
    { title: "Compétence",   dataIndex: "competenceLabel", key: "label", width: "28%" },
    {
      title: "Actuel",
      dataIndex: "niveauActuel",
      key: "actuel",
      render: (v: number) => <Progress percent={v * 20} size="small" steps={5} strokeColor={scoreColor(v)} showInfo={false} />,
    },
    {
      title: "Cible",
      dataIndex: "niveauCible",
      key: "cible",
      render: (v: number) => <Text strong>N{v}</Text>,
    },
    {
      title: "Gravité",
      dataIndex: "gravite",
      key: "gravite",
      render: (g: string) => <Tag color={graviteColor(g)}>{g?.toUpperCase()}</Tag>,
    },
    { title: "Explication",  dataIndex: "explication",    key: "explic" },
  ];

  const formationColumns = [
    { title: "Formation", dataIndex: "titre",    key: "titre",   width: "40%" },
    { title: "Début",     dataIndex: "dateDebut",key: "debut"               },
    { title: "Fin",       dataIndex: "dateFin",  key: "fin"                 },
    { title: "Durée",     dataIndex: "duree",    key: "duree"               },
    {
      title: "Statut",
      dataIndex: "statut",
      key: "statut",
      render: (s: string) => {
        let c = "default";
        if (s?.includes("TERMINEE")) c = "green";
        else if (s?.includes("COURS")) c = "orange";
        return <Tag color={c}>{s}</Tag>;
      },
    },
  ];

  const certColumns = [
    { title: "Formation certifiante", dataIndex: "titreFormation", key: "titre",  width: "50%" },
    { title: "Type",                  dataIndex: "typeCertif",      key: "type"               },
    { title: "Date d'obtention",      dataIndex: "dateObtention",   key: "date"               },
  ];

  const recoColumns = [
    { title: "Formation recommandée",   dataIndex: "titre",   key: "titre",    width: "35%" },
    { title: "Durée",                   dataIndex: "duree",   key: "duree",    width: "10%" },
    {
      title: "Priorité",
      dataIndex: "priorite",
      key: "priorite",
      render: (p: string) => {
        let c = "default";
        if (p === "haute") c = "red";
        else if (p === "moyenne") c = "orange";
        return <Tag color={c}>{p?.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Prob. réussite",
      dataIndex: "probabiliteReussite",
      key: "prob",
      render: (v: number) => (
        <Progress percent={Math.round(v * 100)} size="small" strokeColor={scoreColor(v * 5)} />
      ),
    },
    { title: "Justification", dataIndex: "justification", key: "just" },
  ];

  // ── Rendu ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={s.loadingWrapper}>
        <Spin size="large" tip="Chargement du passeport de compétences…"><div /></Spin>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Erreur"
        description={error}
        showIcon
        action={
          <Button size="small" onClick={() => fetchPassport()}>
            Réessayer
          </Button>
        }
        className={s.errorAlert}
      />
    );
  }

  if (!passport) return null;

  const { identity, scoreGlobal, statut, domaines, formations, certifications, gaps, recommandations } = passport;

  return (
    <div className={s.pageWrapper}>

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Passeport de Compétences"
        subtitle="Synthèse des compétences, formations et certifications"
        actions={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={downloadLoading}
            onClick={handleDownloadPdf}
            size="large"
          >
            {downloadLabel ?? "Télécharger PDF"}
          </Button>
        }
      />

      {/* ── Identité ─────────────────────────────────────────────────── */}
      <div className={s.identityCard}>
        <Space direction="vertical" size={4}>
          <Text strong className={s.identityName}>
            {identity.prenom} {identity.nom}
          </Text>
          <Space size={16} wrap>
            <Text className={s.identityMeta}><MailOutlined style={{ marginRight: 6 }} />{identity.email}</Text>
            <Text className={s.identityMeta}><CalendarOutlined style={{ marginRight: 6 }} />Généré le {passport.dateGeneration?.replace("T", " ").slice(0, 16)}</Text>
          </Space>
        </Space>
        <div className={s.scoreWrapper}>
          <div className={s.scoreValue} style={{ color: scoreColor(scoreGlobal) }}>
            {scoreGlobal.toFixed(1)}<span className={s.scoreUnit}>/5</span>
          </div>
          <div className={s.statutTagRow}>{statutTag(statut)}</div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { icon: <BookOutlined />, value: passport.totalSavoirsMaitrises, label: "Savoirs maîtrisés", color: brand[500] },
          { icon: <TrophyOutlined />, value: passport.totalFormations,     label: "Formations suivies",  color: "#27ae60" },
          { icon: <SafetyCertificateOutlined />, value: passport.totalCertifications, label: "Certifications", color: "#e67e22" },
          { icon: <WarningOutlined />, value: passport.totalGaps,          label: "Gaps détectés",       color: "#c0392b" },
        ].map((kpi) => (
          <Col xs={12} md={6} key={kpi.label}>
            <Card styles={{ body: { textAlign: "center", padding: 20 } }}>
              <div className={s.kpiIcon} style={{ color: kpi.color }}>{kpi.icon}</div>
              <Statistic value={kpi.value} valueStyle={{ color: kpi.color, fontSize: 32 }} />
              <Text type="secondary" className={s.kpiLabel}>{kpi.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Domaines & Compétences ───────────────────────────────────── */}
      <Card
        title={<Title level={4} className={s.cardTitle}>Domaines & Compétences Maîtrisées</Title>}
        className={s.sectionCard}
      >
        {(!domaines || domaines.length === 0) ? (
          <Paragraph type="secondary" italic>Aucune compétence enregistrée.</Paragraph>
        ) : (
          domaines.map((domaine, idx) => (
            <div key={domaine.domaineId ?? domaine.nom} className={s.domainRow}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                <Col>
                  <Text strong className={s.domainName} style={{ color: brand[700] }}>{domaine.nom}</Text>
                  <Text type="secondary" className={s.domainSavoirs}>
                    {domaine.totalSavoirs} savoirs
                  </Text>
                </Col>
                <Col>
                  <Tooltip title={`Score moyen : ${domaine.scoreGlobal.toFixed(1)}/5`}>
                    <Progress
                      percent={domaine.scoreGlobal * 20}
                      size="small"
                      strokeColor={scoreColor(domaine.scoreGlobal)}
                      format={() => `${domaine.scoreGlobal.toFixed(1)}/5`}
                      className={s.progressBar}
                    />
                  </Tooltip>
                </Col>
              </Row>
              {domaine.competences?.flatMap((comp) => comp.savoirs ?? []).length > 0 && (
                <Table
                  dataSource={domaine.competences?.flatMap((comp) =>
                    (comp.savoirs ?? []).map((sv) => ({ ...sv, competenceNom: comp.nom, key: sv.code }))
                  )}
                  columns={[
                    { title: "Compétence", dataIndex: "competenceNom", key: "comp", width: "25%" },
                    { title: "Savoir",     dataIndex: "nom",            key: "nom" },
                    { title: "Type",       dataIndex: "type",           key: "type",   width: "12%" },
                    {
                      title: "Niveau",
                      dataIndex: "niveauLabel",
                      key: "niveau",
                      width: "18%",
                      render: (l: string, r: { niveauNumeric: number }) => {
                        let niveauColor = "red";
                        if (r.niveauNumeric >= 4) niveauColor = "green";
                        else if (r.niveauNumeric >= 3) niveauColor = "orange";
                        return <Tag color={niveauColor}>{l}</Tag>;
                      },
                    },
                    { title: "Acquis le", dataIndex: "dateAcquisition", key: "date", width: "14%" },
                  ]}
                  size="small"
                  pagination={false}
                  className={s.tableSmall}
                />
              )}
              {idx < domaines.length - 1 && <Divider className={s.tightDivider} />}
            </div>
          ))
        )}
      </Card>

      {/* ── Formations ───────────────────────────────────────────────── */}
      <Card
        title={<Title level={4} className={s.cardTitle}>Formations Suivies</Title>}
        className={s.sectionCard}
      >
        <Table<TrainingHistoryDTO>
          dataSource={formations ?? []}
          columns={formationColumns}
          rowKey="formationId"
          size="small"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: "Aucune formation enregistrée." }}
        />
      </Card>

      {/* ── Certifications ───────────────────────────────────────────── */}
      <Card
        title={<Title level={4} className={s.cardTitle}>Certifications Obtenues</Title>}
        className={s.sectionCard}
      >
        <Table<CertificationSummaryDTO>
          dataSource={certifications ?? []}
          columns={certColumns}
          rowKey={(r) => String(r.certificatId ?? r.titreFormation)}
          size="small"
          pagination={false}
          locale={{ emptyText: "Aucune certification." }}
        />
      </Card>

      {/* ── Gaps prioritaires ────────────────────────────────────────── */}
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Gaps Prioritaires Détectés</Title>}
        style={{ marginBottom: 24 }}
      >
        {(!gaps || gaps.length === 0) ? (
          <Alert type="success" message="Aucun gap critique — profil complet." showIcon />
        ) : (
          <Table<SkillGapSummaryDTO>
            dataSource={gaps}
            columns={gapColumns}
            rowKey="competenceCode"
            size="small"
            pagination={false}
          />
        )}
      </Card>

      {/* ── Recommandations ──────────────────────────────────────────── */}
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Recommandations de Formations</Title>}
        style={{ marginBottom: 24 }}
      >
        <Table<RecommendationSummaryDTO>
          dataSource={recommandations ?? []}
          columns={recoColumns}
          rowKey="formationId"
          size="small"
          pagination={false}
          locale={{ emptyText: "Aucune recommandation disponible." }}
        />
      </Card>

    </div>
  );
}




