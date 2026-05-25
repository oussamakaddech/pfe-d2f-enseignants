import { useState, useEffect } from "react";
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
import SkillPassportService, {
  TeacherSkillPassportDTO,
  SkillGapSummaryDTO,
  TrainingHistoryDTO,
  CertificationSummaryDTO,
  RecommendationSummaryDTO,
} from "@/services/certificat/SkillPassportService";
import { AppPageHeader, brand, neutral, shadow, radius } from "@/components/common";
import "@/styles/pages/skill-passport-page.css";

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
  const [passport, setPassport] = useState<TeacherSkillPassportDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPassport();
  }, [targetUsername]);

  const fetchPassport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = targetUsername
        ? await SkillPassportService.getPassportDataByUsername(targetUsername)
        : await SkillPassportService.getMyPassportData();
      setPassport(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as { message?: string })?.message;
      setError(msg ?? "Impossible de charger les données du passeport.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadLoading(true);
    try {
      if (targetUsername) {
        await SkillPassportService.downloadPassportByUsername(targetUsername);
      } else {
        await SkillPassportService.downloadMyPassport();
      }
    } catch {
      setError("Échec du téléchargement PDF. Veuillez réessayer.");
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
    { title: "Explication",  dataIndex: "explication",    key: "explic", ellipsis: true },
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
    { title: "Justification", dataIndex: "justification", key: "just", ellipsis: true },
  ];

  // ── Rendu ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
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
          <Button size="small" onClick={fetchPassport}>
            Réessayer
          </Button>
        }
        style={{ margin: 24 }}
      />
    );
  }

  if (!passport) return null;

  const { identity, scoreGlobal, statut, domaines, formations, certifications, gaps, recommandations } = passport;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

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
      <div style={{
        background: "#fff", borderRadius: radius.lg,
        border: `1px solid rgba(0,0,0,0.07)`,
        borderLeft: `4px solid ${brand[600]}`,
        boxShadow: shadow.sm, padding: "20px 24px",
        marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: 18, color: neutral[900] }}>
            {identity.prenom} {identity.nom}
          </Text>
          <Space size={16} wrap>
            <Text style={{ color: neutral[500], fontSize: 13 }}><MailOutlined style={{ marginRight: 6 }} />{identity.email}</Text>
            <Text style={{ color: neutral[500], fontSize: 13 }}><CalendarOutlined style={{ marginRight: 6 }} />Généré le {passport.dateGeneration?.replace("T", " ").slice(0, 16)}</Text>
          </Space>
        </Space>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(scoreGlobal), lineHeight: 1 }}>
            {scoreGlobal.toFixed(1)}<span style={{ fontSize: 18, color: neutral[400], fontWeight: 400 }}>/5</span>
          </div>
          <div style={{ marginTop: 8 }}>{statutTag(statut)}</div>
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
              <div style={{ fontSize: 28, color: kpi.color, marginBottom: 4 }}>{kpi.icon}</div>
              <Statistic value={kpi.value} valueStyle={{ color: kpi.color, fontSize: 32 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>{kpi.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Domaines & Compétences ───────────────────────────────────── */}
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Domaines & Compétences Maîtrisées</Title>}
        style={{ marginBottom: 24 }}
      >
        {(!domaines || domaines.length === 0) ? (
          <Paragraph type="secondary" italic>Aucune compétence enregistrée.</Paragraph>
        ) : (
          domaines.map((domaine) => (
            <div key={domaine.domaineId ?? domaine.nom} style={{ marginBottom: 20 }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                <Col>
                  <Text strong style={{ fontSize: 14, color: brand[700] }}>{domaine.nom}</Text>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
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
                      style={{ width: 140 }}
                    />
                  </Tooltip>
                </Col>
              </Row>
              {domaine.competences?.flatMap((comp) => comp.savoirs ?? []).length > 0 && (
                <Table
                  dataSource={domaine.competences?.flatMap((comp) =>
                    (comp.savoirs ?? []).map((s) => ({ ...s, competenceNom: comp.nom, key: s.code }))
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
                  style={{ fontSize: 12 }}
                />
              )}
              {idx < domaines.length - 1 && <Divider style={{ margin: "12px 0" }} />}
            </div>
          ))
        )}
      </Card>

      {/* ── Formations ───────────────────────────────────────────────── */}
      <Card
        title={<Title level={4} style={{ margin: 0 }}>Formations Suivies</Title>}
        style={{ marginBottom: 24 }}
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
        title={<Title level={4} style={{ margin: 0 }}>Certifications Obtenues</Title>}
        style={{ marginBottom: 24 }}
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




