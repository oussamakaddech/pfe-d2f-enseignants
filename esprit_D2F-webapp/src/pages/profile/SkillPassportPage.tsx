import { useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Tag,
  Typography,
  Alert,
  Tooltip,
  Avatar,
  Empty,
  Collapse,
} from "antd";
import {
  DownloadOutlined,
  SafetyCertificateOutlined,
  BookOutlined,
  TrophyOutlined,
  WarningOutlined,
  MailOutlined,
  CalendarOutlined,
  PhoneOutlined,
  CheckCircleFilled,
  RiseOutlined,
  AimOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import type {
  SkillGapSummaryDTO,
  TrainingHistoryDTO,
  CertificationSummaryDTO,
  RecommendationSummaryDTO,
  DomainSummaryDTO,
} from "@/models/certificat";
import {
  useMyPassportData,
  usePassportDataByUsername,
  useDownloadMyPassport,
  useDownloadPassportByUsername,
} from "@/hooks/certificat/useSkillPassport";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/skill-passport-page.css";
import s from "./SkillPassportPage.module.css";

const { Text, Paragraph } = Typography;

interface Props {
  /** Si fourni, affiche le passeport d'un autre enseignant (admin/CUP). */
  readonly targetUsername?: string;
  /** Libellé affiché sur le bouton de téléchargement. */
  readonly downloadLabel?: string;
}

/* ── Helpers visuels ──────────────────────────────────────────────────── */

const scoreColor = (score: number): string => {
  if (score >= 4) return "#10b981";
  if (score >= 3) return "#f59e0b";
  return "#ef4444";
};

const scoreGradient = (score: number): { from: string; to: string } => {
  if (score >= 4) return { from: "#34d399", to: "#059669" };
  if (score >= 3) return { from: "#fbbf24", to: "#d97706" };
  return { from: "#f87171", to: "#dc2626" };
};

const statutMeta = (statut: string): { color: string; label: string; icon: ReactNode } => {
  const map: Record<string, { color: string; label: string; icon: ReactNode }> = {
    "maîtrisé": { color: "#10b981", label: "Profil maîtrisé", icon: <CheckCircleFilled /> },
    en_progression: { color: "#f59e0b", label: "En progression", icon: <RiseOutlined /> },
    "à_risque": { color: "#ef4444", label: "À renforcer", icon: <WarningOutlined /> },
  };
  return map[statut] ?? { color: "#718096", label: statut, icon: <AimOutlined /> };
};

const graviteColor = (gravite: string): string => {
  const g = (gravite ?? "").toLowerCase();
  if (g.includes("lev") || g.includes("élev")) return "#ef4444";
  if (g.includes("moy")) return "#f59e0b";
  return "#10b981";
};

function formatHeroScore(percent?: number): ReactNode {
  const score = (percent ?? 0) / 20;
  return (
    <span className={s.heroScoreInner}>
      <span className={s.heroScoreValue}>{score.toFixed(1)}</span>
      <span className={s.heroScoreDenom}>/ 5</span>
      <span className={s.heroScoreLabel}>Score global</span>
    </span>
  );
}

function formatRecoScore(p?: number): ReactNode {
  return <span className={s.recoRingVal}>{p}%</span>;
}

const niveauColor = (n: number): string => {
  if (n >= 4) return "#10b981";
  if (n >= 3) return "#f59e0b";
  return "#ef4444";
};

const initiales = (prenom?: string, nom?: string): string =>
  `${(prenom ?? "").charAt(0)}${(nom ?? "").charAt(0)}`.toUpperCase() || "?";

const fmtDate = (iso?: string): string => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

/**
 * Page Passeport de Compétences — design credential moderne.
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
    ? (query.error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
      (query.error as { message?: string })?.message ??
      "Impossible de charger les données du passeport."
    : null;
  const error = downloadError ?? queryError;
  const fetchPassport = query.refetch;

  const handleDownloadPdf = async () => {
    setDownloadLoading(true);
    setDownloadError(null);
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

  /* ── États de chargement / erreur ──────────────────────────────────── */
  if (loading) {
    return (
      <div className={s.loadingWrapper}>
        <Spin size="large" tip="Chargement du passeport de compétences…">
          <div style={{ minHeight: 120 }} />
        </Spin>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="Erreur de chargement"
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
  const sm = statutMeta(statut);
  const grad = scoreGradient(scoreGlobal);

  const kpis = [
    { icon: <BookOutlined />, value: passport.totalSavoirsMaitrises, label: "Savoirs maîtrisés", from: "#6366f1", to: "#4338ca" },
    { icon: <TrophyOutlined />, value: passport.totalFormations, label: "Formations suivies", from: "#34d399", to: "#059669" },
    { icon: <SafetyCertificateOutlined />, value: passport.totalCertifications, label: "Certifications", from: "#fbbf24", to: "#d97706" },
    { icon: <WarningOutlined />, value: passport.totalGaps, label: "Gaps détectés", from: "#f87171", to: "#dc2626" },
  ];

  return (
    <div className={s.pageWrapper}>
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Passeport de Compétences"
        subtitle="Synthèse certifiée des compétences, formations et certifications"
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

      {/* ── Bannière credential ─────────────────────────────────────────── */}
      <div className={s.hero}>
        <div className={s.heroPattern} aria-hidden />
        <div className={s.heroLeft}>
          <Avatar size={88} className={s.heroAvatar}>
            {initiales(identity.prenom, identity.nom)}
          </Avatar>
          <div className={s.heroIdentity}>
            <div className={s.heroVerified}>
              <SafetyCertificateOutlined /> Passeport vérifié
            </div>
            <h2 className={s.heroName}>
              {identity.prenom} {identity.nom}
            </h2>
            <div className={s.heroChips}>
              {identity.role && <span className={s.heroRole}>{identity.role.replace("ROLE_", "")}</span>}
              <span className={s.heroChip}>
                <MailOutlined /> {identity.email}
              </span>
              {identity.telephone && (
                <span className={s.heroChip}>
                  <PhoneOutlined /> {identity.telephone}
                </span>
              )}
              <span className={s.heroChip}>
                <CalendarOutlined /> Généré le {fmtDate(passport.dateGeneration)}
              </span>
            </div>
          </div>
        </div>

        <div className={s.heroScore}>
          <Progress
            type="dashboard"
            percent={Math.round(scoreGlobal * 20)}
            gapDegree={90}
            size={150}
            strokeWidth={9}
            strokeColor={{ "0%": grad.from, "100%": grad.to }}
            trailColor="rgba(255,255,255,0.18)"
            format={formatHeroScore}
          />
          <div className={s.heroStatut} style={{ background: `${sm.color}22`, color: sm.color, borderColor: `${sm.color}55` }}>
            {sm.icon} {sm.label}
          </div>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <Row gutter={[18, 18]} className={s.kpiRow}>
        {kpis.map((kpi) => (
          <Col xs={12} lg={6} key={kpi.label}>
            <div className={s.kpiCard}>
              <div className={s.kpiIconTile} style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}>
                {kpi.icon}
              </div>
              <div className={s.kpiBody}>
                <div className={s.kpiValue}>{kpi.value}</div>
                <div className={s.kpiLabel}>{kpi.label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Domaines & Compétences ──────────────────────────────────────── */}
      <SectionCard icon={<BookOutlined />} title="Domaines & Compétences" count={domaines?.length}>
        {!domaines || domaines.length === 0 ? (
          <Empty description="Aucune compétence enregistrée" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className={s.domainList}>
            {domaines.map((domaine) => (
              <DomainBlock key={domaine.domaineId ?? domaine.nom} domaine={domaine} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Gaps prioritaires ───────────────────────────────────────────── */}
      <SectionCard icon={<AimOutlined />} title="Gaps prioritaires détectés" count={gaps?.length}>
        {!gaps || gaps.length === 0 ? (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleFilled />}
            message="Aucun gap critique"
            description="Le profil de compétences est complet par rapport aux cibles attendues."
            className={s.successInline}
          />
        ) : (
          <div className={s.gapList}>
            {gaps.map((gap) => (
              <GapRow key={gap.competenceCode} gap={gap} />
            ))}
          </div>
        )}
      </SectionCard>

      <Row gutter={[18, 18]}>
        {/* ── Formations ─────────────────────────────────────────────────── */}
        <Col xs={24} xl={14}>
          <SectionCard icon={<TrophyOutlined />} title="Formations suivies" count={formations?.length} fill>
            {!formations || formations.length === 0 ? (
              <Empty description="Aucune formation enregistrée" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className={s.trainingList}>
                {formations.map((f) => (
                  <TrainingRow key={f.formationId} f={f} />
                ))}
              </div>
            )}
          </SectionCard>
        </Col>

        {/* ── Certifications ─────────────────────────────────────────────── */}
        <Col xs={24} xl={10}>
          <SectionCard icon={<SafetyCertificateOutlined />} title="Certifications" count={certifications?.length} fill>
            {!certifications || certifications.length === 0 ? (
              <Empty description="Aucune certification" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className={s.certGrid}>
                {certifications.map((c) => (
                  <CertCard key={String(c.certificatId ?? c.titreFormation)} c={c} />
                ))}
              </div>
            )}
          </SectionCard>
        </Col>
      </Row>

      {/* ── Recommandations ─────────────────────────────────────────────── */}
      <SectionCard icon={<BulbOutlined />} title="Recommandations de formations" count={recommandations?.length}>
        {!recommandations || recommandations.length === 0 ? (
          <Empty description="Aucune recommandation disponible" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[16, 16]}>
            {recommandations.map((r) => (
              <Col xs={24} md={12} key={r.formationId}>
                <RecoCard r={r} />
              </Col>
            ))}
          </Row>
        )}
      </SectionCard>

      <div className={s.footer}>
        <SafetyCertificateOutlined /> Document généré automatiquement — ESPRIT · Démarche D2F
      </div>
    </div>
  );
}

/* ── Sous-composants présentationnels ─────────────────────────────────── */

function SectionCard({
  icon,
  title,
  count,
  children,
  fill,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly count?: number;
  readonly children: ReactNode;
  readonly fill?: boolean;
}) {
  return (
    <Card className={`${s.sectionCard} ${fill ? s.sectionFill : ""}`} styles={{ body: { padding: 0 } }}>
      <div className={s.sectionHeader}>
        <span className={s.sectionIcon}>{icon}</span>
        <span className={s.sectionTitle}>{title}</span>
        {typeof count === "number" && <span className={s.sectionCount}>{count}</span>}
      </div>
      <div className={s.sectionBody}>{children}</div>
    </Card>
  );
}

function DomainBlock({ domaine }: { readonly domaine: DomainSummaryDTO }) {
  const savoirs = domaine.competences?.flatMap((comp) =>
    (comp.savoirs ?? []).map((sv) => ({ ...sv, competenceNom: comp.nom })),
  );
  const pct = Math.round(domaine.scoreGlobal * 20);

  return (
    <div className={s.domainCard}>
      <div className={s.domainHead}>
        <div className={s.domainTitleWrap}>
          <span className={s.domainDot} style={{ background: scoreColor(domaine.scoreGlobal) }} />
          <span className={s.domainName}>{domaine.nom}</span>
          <span className={s.domainCount}>{domaine.totalSavoirs} savoirs</span>
        </div>
        <div className={s.domainScore}>
          <Progress
            percent={pct}
            size="small"
            showInfo={false}
            strokeColor={{ "0%": scoreGradient(domaine.scoreGlobal).from, "100%": scoreGradient(domaine.scoreGlobal).to }}
            className={s.domainBar}
          />
          <span className={s.domainScoreVal} style={{ color: scoreColor(domaine.scoreGlobal) }}>
            {domaine.scoreGlobal.toFixed(1)}/5
          </span>
        </div>
      </div>

      {savoirs && savoirs.length > 0 && (
        <Collapse
          ghost
          className={s.domainCollapse}
          items={[
            {
              key: "1",
              label: <Text type="secondary">Voir le détail des {savoirs.length} savoirs</Text>,
              children: (
                <div className={s.savoirList}>
                  {savoirs.map((sv) => (
                    <div className={s.savoirRow} key={sv.code}>
                      <div className={s.savoirMain}>
                        <Text strong className={s.savoirName}>
                          {sv.nom}
                        </Text>
                        <Text type="secondary" className={s.savoirComp}>
                          {sv.competenceNom}
                          {sv.type ? ` · ${sv.type}` : ""}
                        </Text>
                      </div>
                      <div className={s.savoirRight}>
                        <Tag
                          className={s.savoirTag}
                          style={{
                            color: niveauColor(sv.niveauNumeric),
                            background: `${niveauColor(sv.niveauNumeric)}18`,
                            borderColor: `${niveauColor(sv.niveauNumeric)}40`,
                          }}
                        >
                          {sv.niveauLabel}
                        </Tag>
                        {sv.dateAcquisition && (
                          <Text type="secondary" className={s.savoirDate}>
                            {sv.dateAcquisition}
                          </Text>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function GapRow({ gap }: { readonly gap: SkillGapSummaryDTO }) {
  const color = graviteColor(gap.gravite);
  return (
    <div className={s.gapRow} style={{ borderLeftColor: color }}>
      <div className={s.gapInfo}>
        <Text strong className={s.gapLabel}>
          {gap.competenceLabel}
        </Text>
        {gap.explication && (
          <Text type="secondary" className={s.gapExplain}>
            {gap.explication}
          </Text>
        )}
      </div>
      <div className={s.gapLevels}>
        <Tooltip title="Niveau actuel">
          <span className={s.gapLevelActual}>N{gap.niveauActuel}</span>
        </Tooltip>
        <ArrowRightOutlined className={s.gapArrow} />
        <Tooltip title="Niveau cible">
          <span className={s.gapLevelTarget} style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
            N{gap.niveauCible}
          </span>
        </Tooltip>
      </div>
      <Tag className={s.gapTag} style={{ color, background: `${color}18`, borderColor: `${color}40` }}>
        {(gap.gravite ?? "").toUpperCase()}
      </Tag>
    </div>
  );
}

function TrainingRow({ f }: { readonly f: TrainingHistoryDTO }) {
  const statut = f.statut ?? "";
  let statColor = "#718096";
  if (statut.includes("TERMINEE")) statColor = "#10b981";
  else if (statut.includes("COURS")) statColor = "#f59e0b";
  else if (statut.includes("PLANIF")) statColor = "#6366f1";

  return (
    <div className={s.trainingRow}>
      <div className={s.trainingTimeline}>
        <span className={s.trainingDot} style={{ background: statColor }} />
      </div>
      <div className={s.trainingContent}>
        <div className={s.trainingTop}>
          <Text strong className={s.trainingTitle}>
            {f.titre}
          </Text>
          {statut && (
            <Tag className={s.trainingStatut} style={{ color: statColor, background: `${statColor}18`, borderColor: `${statColor}40` }}>
              {statut}
            </Tag>
          )}
        </div>
        <div className={s.trainingMeta}>
          <span>
            <CalendarOutlined /> {f.dateDebut ?? "—"} → {f.dateFin ?? "—"}
          </span>
          {f.duree && (
            <span>
              <ClockCircleOutlined /> {f.duree}
            </span>
          )}
        </div>
        {f.competencesCiblees && f.competencesCiblees.length > 0 && (
          <div className={s.trainingTags}>
            {f.competencesCiblees.map((c) => (
              <span className={s.miniTag} key={c}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CertCard({ c }: { readonly c: CertificationSummaryDTO }) {
  return (
    <div className={s.certCard}>
      <div className={s.certRibbon}>
        <SafetyCertificateOutlined />
      </div>
      <div className={s.certBody}>
        <Text strong className={s.certTitle}>
          {c.titreFormation}
        </Text>
        <div className={s.certMeta}>
          {c.typeCertif && <Tag className={s.certType}>{c.typeCertif}</Tag>}
          {c.dateObtention && (
            <Text type="secondary" className={s.certDate}>
              <CalendarOutlined /> {c.dateObtention}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}

function RecoCard({ r }: { readonly r: RecommendationSummaryDTO }) {
  const prio = (r.priorite ?? "").toLowerCase();
  let prioColor = "#718096";
  if (prio === "haute") prioColor = "#ef4444";
  else if (prio === "moyenne") prioColor = "#f59e0b";
  else if (prio === "basse") prioColor = "#10b981";
  const probPct = Math.round((r.probabiliteReussite ?? 0) * 100);

  return (
    <div className={s.recoCard}>
      <div className={s.recoRing}>
        <Progress
          type="circle"
          size={64}
          percent={probPct}
          strokeColor={{ "0%": "#6366f1", "100%": "#4338ca" }}
          format={formatRecoScore}
        />
        <Text type="secondary" className={s.recoRingLabel}>
          réussite
        </Text>
      </div>
      <div className={s.recoBody}>
        <div className={s.recoTop}>
          <Text strong className={s.recoTitle}>
            {r.titre}
          </Text>
          <Tag className={s.recoPrio} style={{ color: prioColor, background: `${prioColor}18`, borderColor: `${prioColor}40` }}>
            {(r.priorite ?? "").toUpperCase()}
          </Tag>
        </div>
        {r.duree && (
          <Text type="secondary" className={s.recoDuree}>
            <ClockCircleOutlined /> {r.duree}
          </Text>
        )}
        {r.justification && (
          <Paragraph type="secondary" className={s.recoJust} ellipsis={{ rows: 2, tooltip: r.justification }}>
            {r.justification}
          </Paragraph>
        )}
        {r.competencesCiblees && r.competencesCiblees.length > 0 && (
          <div className={s.recoTags}>
            {r.competencesCiblees.map((c) => (
              <span className={s.miniTag} key={c}>
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
