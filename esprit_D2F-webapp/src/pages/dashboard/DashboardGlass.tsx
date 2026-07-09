import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { Row, Col, Empty, Spin, Tooltip, Tag } from "antd";
import {
  ReloadOutlined, LineChartOutlined, HeartOutlined, TeamOutlined,
  SafetyCertificateOutlined, FallOutlined, BellOutlined, RiseOutlined,
  BulbOutlined, WarningOutlined, CalendarOutlined, ThunderboltOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/auth/useAuth";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import { computeHealthScore } from "@/services/dashboard/dashboardService";
import type { DashboardData } from "@/models/analyse";
import { roleColors, brand, accent, semantic } from "@/styles/themes/tokens";
import GlassCard from "@/components/ui/GlassCard";
import GlassKpi from "@/components/ui/GlassKpi";
import TrendLineChart from "@/components/charts/TrendLineChart";
import "@/styles/pages/glass.css";

dayjs.locale("fr");

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  CRITIQUE: { color: semantic.error, bg: semantic.errorBg },
  ELEVE: { color: "#f97316", bg: "#fff7ed" },
  MODERE: { color: semantic.warning, bg: semantic.warningBg },
  FAIBLE: { color: semantic.success, bg: semantic.successBg },
};

function normalizeRole(v: unknown): string {
  return String(v ?? "").toLowerCase().replace(/^role_?/, "").replaceAll(/[\s_-]+/g, "");
}

function greeting(): { text: string; emoji: string } {
  const h = dayjs().hour();
  if (h < 12) return { text: "Bonjour", emoji: "🌅" };
  if (h < 18) return { text: "Bon après-midi", emoji: "☀️" };
  return { text: "Bonsoir", emoji: "🌙" };
}

function HealthRing({ score, color }: { score: number; color: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  return (
    <div className="glass-health-ring">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="11" />
        <circle
          cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 65 65)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="score">
        <div className="glass-health-score" style={{ color }}>{score}</div>
        <div className="glass-health-label">/ 100</div>
      </div>
    </div>
  );
}

export default function DashboardGlass() {
  const { user } = useAuth();
  const { loading, dashboard, lastUpdate, refetch } = useDashboard();
  const navigate = useNavigate();
  const greet = greeting();

  const roleKey = normalizeRole(user?.role);
  const roleStyle = roleColors[roleKey] ?? roleColors[roleKey] ?? { color: brand[500], bg: brand[50], label: "Utilisateur" };
  const displayName = user?.username ?? user?.email ?? "Utilisateur";
  const todayLabel = dayjs().format("dddd D MMMM YYYY");

  const d = dashboard as DashboardData | null;

  const coverage = useMemo(() => {
    const rows = d?.taux_couverture_departements ?? [];
    if (rows.length === 0) return null;
    return Math.round(rows.reduce((s, r) => s + r.taux_couverture, 0) / rows.length);
  }, [d]);

  const health = useMemo(
    () => computeHealthScore({
      coverage: coverage ?? undefined,
      pendingNeeds: d?.alertes_recentes?.length,
      atRisk: d?.enseignants_a_risque?.length,
    }),
    [coverage, d]
  );

  const healthColor =
    health.level === "healthy" ? semantic.success
      : health.level === "attention" ? semantic.warning
        : semantic.error;

  const riskTeachers = (d?.enseignants_a_risque ?? []).slice(0, 6);
  const declining = (d?.competences_en_declin ?? []).slice(0, 6);
  const inDemand = (d?.competences_en_demande ?? []).slice(0, 6);
  const alerts = (d?.alertes_recentes ?? []).slice(0, 6);
  const topFormations = (d?.top_formations_recommandees ?? []).slice(0, 5);
  const eff = (d?.training_effectiveness ?? []).slice(0, 5);

  return (
    <div className="glass-app">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="glass-hero">
        <div className="glass-hero-avatar"><ThunderboltOutlined /></div>
        <div className="glass-hero-body">
          <div className="glass-hero-eyebrow">
            Plateforme D2F
            <span className="glass-hero-role">{roleStyle.label}</span>
          </div>
          <h1 className="glass-hero-title">{greet.emoji} {greet.text}, {displayName}</h1>
          <p className="glass-hero-sub">
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Vue d'ensemble de la formation et des compétences
          </p>
        </div>
        <div className="glass-hero-actions">
          <span className="glass-hero-status">
            <span className="dot ok" />
            {lastUpdate ? `Maj ${lastUpdate}` : "Données en direct"}
          </span>
          <Tooltip title="Rafraîchir">
            <button className="glass-btn" onClick={() => refetch()} disabled={loading}>
              <ReloadOutlined spin={loading} /> Rafraîchir
            </button>
          </Tooltip>
          <button className="glass-btn glass-btn-primary" onClick={() => navigate("/home/AnalysePredictive")}>
            <LineChartOutlined /> Analytique
          </button>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <section className="glass-section" style={{ marginTop: 22 }}>
        <div className="glass-kpi-grid">
          <GlassKpi
            label="Enseignants à risque" icon={<TeamOutlined />} accent={semantic.error} tint={semantic.errorBg}
            value={d ? riskTeachers.length : "—"} hint="Enseignants avec un score de risque élevé"
          />
          <GlassKpi
            label="Couverture compétences" icon={<SafetyCertificateOutlined />} accent={semantic.success} tint={semantic.successBg}
            value={coverage != null ? `${coverage}%` : "—"} hint="Taux de couverture moyen par département"
          />
          <GlassKpi
            label="Compétences en déclin" icon={<FallOutlined />} accent={semantic.warning} tint={semantic.warningBg}
            value={d ? declining.length : "—"} hint="Compétences dont le niveau régresse"
          />
          <GlassKpi
            label="Alertes récentes" icon={<BellOutlined />} accent={semantic.info} tint={semantic.infoBg}
            value={d ? alerts.length : "—"} hint="Alertes générées récemment"
          />
          <GlassKpi
            label="Formations suggérées" icon={<BulbOutlined />} accent="#8b5cf6" tint="rgba(139,92,246,0.12)"
            value={d ? topFormations.length : "—"} hint="Top formations recommandées"
          />
          <GlassKpi
            label="Santé plateforme" icon={<HeartOutlined />} accent={healthColor} tint={`${healthColor}1f`}
            value={`${health.score}/100`} hint={`Niveau: ${health.level}`}
          />
        </div>
      </section>

      {loading && !d ? (
        <div style={{ padding: 80, textAlign: "center" }}><Spin size="large" /></div>
      ) : (
        <>
          {/* ── Santé + Couverture ───────────────────────────── */}
          <section className="glass-section">
            <div className="glass-section-head">
              <span className="bar" /><span className="txt">Santé & couverture</span>
              <span className="sub">Pulsation de la plateforme</span><span className="line" />
            </div>
            <Row gutter={[18, 18]}>
              <Col xs={24} lg={8}>
                <GlassCard title="Score de santé global" subtitle="Indice composite pondéré" icon={<HeartOutlined />} iconColor={healthColor} iconBg={`${healthColor}1f`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <HealthRing score={health.score} color={healthColor} />
                    <div style={{ flex: 1 }}>
                      <Tag color={health.level === "healthy" ? "green" : health.level === "attention" ? "orange" : "red"} style={{ fontWeight: 700 }}>
                        {health.level === "healthy" ? "Sain" : health.level === "attention" ? "Attention" : "Critique"}
                      </Tag>
                      <p className="glass-muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                        Basé sur la couverture, les besoins en attente et l'engagement des enseignants.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </Col>
              <Col xs={24} lg={16}>
                <GlassCard title="Couverture par département" subtitle="Taux de compétences au niveau requis" icon={<SafetyCertificateOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
                  {(d?.taux_couverture_departements ?? []).length === 0 ? (
                    <Empty description="Aucune donnée de couverture" />
                  ) : (
                    <div className="glass-list">
                      {(d?.taux_couverture_departements ?? []).map((dep) => (
                        <div key={dep.departement} className="glass-list-item" style={{ alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span className="li-title">{dep.departement}</span>
                              <span className="glass-muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{dep.taux_couverture}%</span>
                            </div>
                            <div className="glass-bar"><span style={{ width: `${dep.taux_couverture}%` }} /></div>
                          </div>
                          <span className="glass-muted" style={{ fontSize: 12, minWidth: 64, textAlign: "right" }}>{dep.nb_evalues} évalués</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </Col>
            </Row>
          </section>

          {/* ── Risque & efficacité ─────────────────────────── */}
          <section className="glass-section">
            <div className="glass-section-head">
              <span className="bar" /><span className="txt">Risque & efficacité</span>
              <span className="sub">Enseignants à risque et impact des formations</span><span className="line" />
            </div>
            <Row gutter={[18, 18]}>
              <Col xs={24} lg={10}>
                <GlassCard title="Enseignants à risque" subtitle="Top priorités" icon={<WarningOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
                  {riskTeachers.length === 0 ? (
                    <Empty description="Aucun enseignant à risque" />
                  ) : (
                    <div className="glass-list">
                      {riskTeachers.map((t) => {
                        const rc = RISK_COLORS[t.niveau_risque ?? "MODERE"] ?? RISK_COLORS.MODERE;
                        return (
                          <div key={t.enseignant_id} className="glass-list-item">
                            <div className="glass-avatar-sm" style={{ background: rc.color }}>
                              {t.enseignant_id.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="li-main">
                              <div className="li-title">{t.enseignant_id}</div>
                              <div className="li-sub">
                                {t.nb_gaps_critiques} gaps critiques · {t.tendance === "REGRESSION" ? "↘ régression" : t.tendance === "PROGRESSION" ? "↗ progression" : "→ stable"}
                              </div>
                            </div>
                            <Tag style={{ color: rc.color, background: rc.bg, borderColor: "transparent", fontWeight: 700 }}>
                              {Math.round((t.score_risque ?? 0) * 100)}%
                            </Tag>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </Col>
              <Col xs={24} lg={14}>
                <GlassCard title="Efficacité des formations" subtitle="Gain de niveau & complétion" icon={<BulbOutlined />} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)">
                  {eff.length === 0 ? (
                    <Empty description="Aucune donnée d'efficacité" />
                  ) : (
                    <div className="glass-list">
                      {eff.map((f) => (
                        <div key={f.formation_id} className="glass-list-item">
                          <div className="li-main">
                            <div className="li-title">{f.formation_titre}</div>
                            <div className="li-sub">Complétion {Math.round((f.completion_rate ?? 0) * 100)}%</div>
                          </div>
                          <span className="glass-chip" style={{ color: semantic.success }}>+{Number(f.avg_level_gain ?? 0).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </Col>
            </Row>
          </section>

          {/* ── Déclin / Demande / Tendance ──────────────────── */}
          <section className="glass-section">
            <Row gutter={[18, 18]}>
              <Col xs={24} lg={8}>
                <GlassCard title="Compétences en déclin" subtitle="Niveau en régression" icon={<FallOutlined />} iconColor={semantic.error} iconBg={semantic.errorBg}>
                  {declining.length === 0 ? <Empty description="Aucune" /> : (
                    <div className="glass-list">
                      {declining.map((c) => (
                        <div key={c.competence_id} className="glass-list-item">
                          <div className="li-main">
                            <div className="li-title">{c.competence_nom}</div>
                            <div className="li-sub">{c.domaine_nom}</div>
                          </div>
                          <span className="glass-chip" style={{ color: semantic.error }}><ArrowDownOutlined /> {c.delta?.toFixed(1) ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </Col>
              <Col xs={24} lg={8}>
                <GlassCard title="Compétences en forte demande" subtitle="Priorité d'action" icon={<RiseOutlined />} iconColor={semantic.success} iconBg={semantic.successBg}>
                  {inDemand.length === 0 ? <Empty description="Aucune" /> : (
                    <div className="glass-list">
                      {inDemand.map((c) => (
                        <div key={c.competence_id} className="glass-list-item">
                          <div className="li-main">
                            <div className="li-title">{c.competence_nom}</div>
                            <div className="li-sub">{c.domaine_nom} · {c.nb_gaps} gaps</div>
                          </div>
                          <span className="glass-chip" style={{ color: semantic.info }}><ArrowUpOutlined /> {c.score_demande?.toFixed(0) ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </Col>
              <Col xs={24} lg={8}>
                <GlassCard title="Tendance du risque" subtitle="6 derniers mois" icon={<CalendarOutlined />} iconColor={accent[500]} iconBg="rgba(0,180,216,0.12)">
                  {(d?.monthly_risk_evolution ?? []).length === 0 ? (
                    <Empty description="Pas d'historique" />
                  ) : (
                    <TrendLineChart data={d?.monthly_risk_evolution ?? []} />
                  )}
                </GlassCard>
              </Col>
            </Row>
          </section>

          {/* ── Alertes & Formations ────────────────────────── */}
          <section className="glass-section">
            <Row gutter={[18, 18]}>
              <Col xs={24} lg={14}>
                <GlassCard title="Alertes récentes" subtitle="À traiter en priorité" icon={<BellOutlined />} iconColor={semantic.info} iconBg={semantic.infoBg}>
                  {alerts.length === 0 ? <Empty description="Aucune alerte récente" /> : (
                    <div className="glass-list">
                      {alerts.map((a) => {
                        const col = a.severite === "CRITICAL" ? semantic.error : a.severite === "WARNING" ? semantic.warning : semantic.info;
                        return (
                          <div key={a.id} className="glass-list-item">
                            <span className="glass-avatar-sm" style={{ background: col, fontSize: 14 }}><WarningOutlined /></span>
                            <div className="li-main">
                              <div className="li-title">{a.titre}</div>
                              <div className="li-sub">{dayjs(a.created_at).format("DD/MM HH:mm")}</div>
                            </div>
                            <Tag style={{ color: col, background: `${col}1f`, borderColor: "transparent", fontWeight: 700 }}>{a.severite}</Tag>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </Col>
              <Col xs={24} lg={10}>
                <GlassCard title="Formations recommandées" subtitle="Top prioritaire" icon={<BulbOutlined />} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)">
                  {topFormations.length === 0 ? <Empty description="Aucune recommandation" /> : (
                    <div className="glass-list">
                      {topFormations.map((f, i) => (
                        <div key={f.formation_id} className="glass-list-item">
                          <div className="glass-avatar-sm" style={{ background: "rgba(139,92,246,0.16)", color: "#8b5cf6" }}>{i + 1}</div>
                          <div className="li-main">
                            <div className="li-title">{f.formation_titre}</div>
                            <div className="li-sub">{f.nb_recommandations} recommandations · score {f.score_moyen?.toFixed(1) ?? "—"}</div>
                          </div>
                          <span className="glass-chip" style={{ color: semantic.success }}>{Math.round((f.proba_reussite_moy ?? 0) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </Col>
            </Row>
          </section>
        </>
      )}
    </div>
  );
}
