import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Spin, Empty, Button, Drawer, Descriptions, Alert,
} from "antd";
import { ReloadOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { useAuth } from "@/hooks/auth/useAuth";
import { normalizeRole } from "@/utils/constants/roles";
import { greeting } from "@/utils/helpers/greeting";
import { NA_CALC } from "@/utils/states";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { computeHealthScore } from "@/services/dashboard/dashboardService";
import { useOverview, useAlertsSummary } from "@/hooks/analyse/useAnalysePredictive";
import { useBesoins } from "@/hooks/besoin/useBesoins";
import { useAllCertificates } from "@/hooks/certificat/useCertificats";
import { useInactifs, useFormationsTimeline, useParticipationByDept } from "@/hooks/dashboard/useDashboardData";
import { usePlatformKPIs } from "@/hooks/dashboard/usePlatformStats";
import type { FormationReco } from "@/redesign/contract";
import { toCoveragePercent } from "@/redesign/risk";
import { brand, semantic } from "@/styles/themes/tokens";
import { useUnifiedDashboard, selectFormationRecos, useUnifiedRiskTrend } from "@/redesign/useUnified";
import type { DashboardScope } from "@/models/dashboard";
import type { AnalyticsDepartement } from "@/models/analyse/reporting";

dayjs.locale("fr");

const ACCENT = brand[500];

/* ──────────────────────────────────────────────────────────────────────────
   Tableau de bord institutionnel — D2F (Glassmorphism premium)
   Modules : Synthèse · Formations · Besoins & compétences · Risque & alertes
             · Recommandations & impact
   ──────────────────────────────────────────────────────────────────────── */

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const { message } = useAppNotification();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const greet = greeting();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<FormationReco | null>(null);

  const { d, error, lastUpdate, refetch } = useUnifiedDashboard();
  const { data: overview, isLoading: ovLoading, isError: ovError, refetch: refetchOverview } = useOverview();
  const { data: alerts, isLoading: alertsLoading } = useAlertsSummary();
  const { data: besoins = [], isLoading: besoinsLoading } = useBesoins();
  const { data: certificats = [] } = useAllCertificates();
  const { data: inactifs, isLoading: inactifsLoading } = useInactifs();
  const { formationsByEtat, formationsByType } = usePlatformKPIs();

  const timelineScope = useMemo<DashboardScope>(() => {
    const role = (normalizeRole(user?.role) || "admin").toLowerCase();
    return {
      role,
      isAdmin: role === "admin",
      isCup: role === "cup",
      isEnseignant: role === "enseignant",
      isAnimateur: role === "animateur",
      start: dayjs().subtract(11, "month").startOf("month").format("YYYY-MM-DD"),
      end: dayjs().endOf("month").format("YYYY-MM-DD"),
      rangeKey: "12m",
    };
  }, [user?.role]);
  const { data: timeline, isLoading: timelineLoading } = useFormationsTimeline(timelineScope);
  const { data: deptAnalytics, isLoading: deptLoading } = useParticipationByDept(true);
  const { trend: riskTrend } = useUnifiedRiskTrend(6);

  const reclos = useMemo(() => selectFormationRecos(d), [d]);

  const besoinsByPriorite = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const b of besoins) {
      const p = b.priorite ?? "NON_DEFINIE";
      acc[p] = (acc[p] ?? 0) + 1;
    }
    return acc;
  }, [besoins]);
  const pendingBesoins = useMemo(() => besoins.filter((b) => !b.approuveAdmin).length, [besoins]);

  const coveragePct = overview ? toCoveragePercent(overview.taux_couverture_global) : null;

  const avgGain = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    return Math.round((eff.reduce((s, f) => s + (f.avg_level_gain ?? 0), 0) / eff.length) * 10) / 10;
  }, [d]);
  const avgCompletion = useMemo(() => {
    const eff = d?.training_effectiveness ?? [];
    if (!eff.length) return null;
    return Math.round((eff.reduce((s, f) => s + (f.completion_rate ?? 0), 0) / eff.length) * 100);
  }, [d]);
  const avgParticipation = useMemo(() => {
    const deps = deptAnalytics?.departements ?? [];
    const valid = deps.filter((x) => x.tauxParticipation != null);
    if (!valid.length) return null;
    return Math.round(valid.reduce((s, x) => s + (x.tauxParticipation || 0), 0) / valid.length);
  }, [deptAnalytics]);

  const topDemande = useMemo(() => (d?.competences_en_demande ?? []).slice(0, 5), [d]);
  const topDeficit = useMemo(() => (d?.competences_en_declin ?? []).slice(0, 5), [d]);
  const topDepartementsEnRetard = useMemo(
    () => [...(d?.taux_couverture_departements ?? [])].sort((a: any, b: any) => a.taux_couverture - b.taux_couverture).slice(0, 6),
    [d],
  );

  const teachersAtRisk = (d?.enseignants_a_risque ?? []).length;
  const formationsTermineRatio = (() => {
    const t = formationsByEtat.data?.total ?? 0;
    return t === 0 ? 0 : Math.round(((formationsByEtat.data?.acheve ?? 0) / t) * 100);
  })();

  const health = useMemo(
    () => computeHealthScore({ coverage: coveragePct ?? undefined, pendingNeeds: pendingBesoins, atRisk: teachersAtRisk }),
    [coveragePct, pendingBesoins, teachersAtRisk],
  );
  const healthColor = health.level === "healthy" ? semantic.success : health.level === "attention" ? semantic.warning : semantic.error;

  const timelineData = useMemo(
    () => (timeline?.periodes ?? []).map((p) => ({ label: p.label, value: p.nombreFormations })),
    [timeline],
  );
  const riskTrendData = useMemo(
    () => (riskTrend ?? []).map((p) => ({ label: p.month, value: p.critical })),
    [riskTrend],
  );

  const todayLabel = dayjs().format("dddd D MMMM YYYY");
  const displayName = user?.username ?? user?.email ?? "Utilisateur";

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["analyse"] });
      await qc.invalidateQueries({ queryKey: ["kpi"] });
      message.success("Tableau de bord actualisé.");
    } finally {
      setRefreshing(false);
    }
  }

  const na = (v: unknown): string | number =>
    v == null || v === "" || (typeof v === "number" && Number.isNaN(v)) ? NA_CALC : (v as string | number);

  const primaryStats: Stat[] = [
    { label: "Formations totales", value: formationsByEtat.data?.total, hint: `${formationsByEtat.data?.acheve ?? 0} achevées`, loading: formationsByEtat.isLoading, accent: ACCENT },
    { label: "En cours", value: formationsByEtat.data?.enCours, loading: formationsByEtat.isLoading, accent: "#f59e0b" },
    { label: "Besoins en attente", value: pendingBesoins, hint: `${besoins.length} saisis`, loading: besoinsLoading, accent: "#f59e0b" },
    { label: "Couverture", value: coveragePct == null ? null : `${coveragePct}%`, loading: ovLoading, accent: semantic.success },
    { label: "Enseignants suivis", value: overview?.nb_enseignants_suivis, loading: ovLoading, accent: "#0ea5e9" },
    { label: "Alertes critiques", value: alerts?.critiques_ouvertes, hint: `${alerts?.total ?? 0} ouvertes`, loading: alertsLoading, accent: semantic.error },
    { label: "Recommandations", value: reclos.length, accent: "#8b5cf6" },
    { label: "Certificats", value: certificats.length || null, accent: semantic.success },
  ];
  const secondaryStats: Stat[] = [
    { label: "Participation", value: avgParticipation == null ? null : `${avgParticipation}%`, loading: deptLoading, accent: "#0ea5e9" },
    { label: "Complétion moyenne", value: avgCompletion == null ? null : `${avgCompletion}%`, accent: semantic.success },
    { label: "Sans formation ≥6m", value: inactifs?.total, loading: inactifsLoading, accent: "#f59e0b" },
    { label: "Santé globale", value: `${health.score}/100`, accent: healthColor },
    { label: "Précision modèle", value: d?.model_performance?.gap_model_accuracy != null ? `${Math.round(d.model_performance.gap_model_accuracy * 100)}%` : null, accent: "#8b5cf6" },
    { label: "Gain moyen", value: avgGain == null ? null : `+${avgGain}`, accent: semantic.success },
  ];

  const etatItems = [
    { key: "enregistre", label: "Enregistrées", value: formationsByEtat.data?.enregistre ?? 0, color: "#94a3b8" },
    { key: "planifie", label: "Planifiées", value: formationsByEtat.data?.planifie ?? 0, color: "#6366f1" },
    { key: "enCours", label: "En cours", value: formationsByEtat.data?.enCours ?? 0, color: "#f59e0b" },
    { key: "acheve", label: "Achevées", value: formationsByEtat.data?.acheve ?? 0, color: semantic.success },
    { key: "annule", label: "Annulées", value: formationsByEtat.data?.annule ?? 0, color: semantic.error },
  ];
  const typeItems = [
    { label: "Interne", value: formationsByType.data?.interne ?? 0, color: "#6366f1" },
    { label: "Externe", value: formationsByType.data?.externe ?? 0, color: "#f59e0b" },
    { label: "En ligne", value: formationsByType.data?.enLigne ?? 0, color: "#0ea5e9" },
  ];

  if (error || ovError) {
    return (
      <div className="glass-page">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="glass-wrap">
          <div className="glass" style={{ padding: 28 }}>
            <Alert type="error" showIcon message="Impossible de charger le tableau de bord"
              action={<Button size="small" onClick={() => { refetch(); refetchOverview(); }}>Réessayer</Button>} />
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <div className="glass-page">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="glass-wrap">
        <style>{CSS}</style>

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="glass-top">
          <div>
            <div className="eyebrow">Plateforme D2F</div>
            <h1 className="grad-text">{greet.emoji} {greet.text}, {displayName}</h1>
            <div className="sub">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · Vue institutionnelle consolidée</div>
          </div>
          <div className="right">
            <span className="glass-live"><span className={`dot${error ? " err" : ""}`} />{lastUpdate ? `Maj ${lastUpdate}` : "Données en direct"}</span>
            <button className="glass-btn" onClick={handleRefresh} disabled={refreshing}>
              <ReloadOutlined spin={refreshing} /> Rafraîchir
            </button>
          </div>
        </div>

        {/* ── KPI strip ────────────────────────────────────────────────── */}
        <div className="stat-grid">
          {primaryStats.map((s) => (
            <div className="glass stat" key={s.label} style={s.accent ? ({ "--accent-bd": s.accent } as CSSProperties) : undefined}>
              <div className="l">{s.label}</div>
              <div className="v">{s.loading ? <Spin size="small" /> : na(s.value)}</div>
              {s.hint && <div className="h">{s.hint}</div>}
            </div>
          ))}
        </div>
        <div className="stat-grid">
          {secondaryStats.map((s) => (
            <div className="glass stat" key={s.label} style={s.accent ? ({ "--accent-bd": s.accent } as CSSProperties) : undefined}>
              <div className="l">{s.label}</div>
              <div className="v" style={{ fontSize: 18 }}>{s.loading ? <Spin size="small" /> : na(s.value)}</div>
            </div>
          ))}
        </div>

        {/* ════════ MODULE Formations ════════ */}
        <div className="mod-label">Formations</div>
        <div className="glass-grid">
          <div className="glass card">
            <CardTitle title="Par état" extra={`${formationsByEtat.data?.total ?? 0} formations`} />
            {formationsByEtat.isLoading ? <Loading /> : <Donut items={etatItems} total={formationsByEtat.data?.total ?? 0} />}
          </div>
          <div className="glass card">
            <CardTitle title="Complétion moyenne" extra={`Achevées ${formationsTermineRatio}%`} />
            <div className="row" style={{ alignItems: "center", gap: 18 }}>
              <Ring value={avgCompletion ?? 0} color={semantic.success} size={104} suffix="%" />
              <div>
                <div className="bignum" style={{ fontSize: 28, color: semantic.success }}>{avgGain != null ? `+${avgGain}` : NA_CALC}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>points gagnés en moyenne</div>
              </div>
            </div>
          </div>
          <div className="glass card col-2">
            <CardTitle title="Par type" />
            {formationsByType.isLoading ? <Loading /> : <SegBars items={typeItems} />}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Évolution mensuelle" extra={`${timeline?.totalFormations ?? 0} sur 12 mois`} />
            {timelineLoading ? <Loading /> : <LineAreaChart data={timelineData} color={ACCENT} />}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Par département" extra="Top 8 · formations organisées" />
            {deptLoading ? <Loading /> : <DeptBars departements={deptAnalytics?.departements ?? []} />}
          </div>
        </div>

        {/* ════════ MODULE Besoins & compétences ════════ */}
        <div className="mod-label">Besoins & compétences</div>
        <div className="glass-grid">
          <div className="glass card">
            <CardTitle title="Besoins par priorité" extra={`${besoins.length} au total`} />
            {besoinsLoading ? <Loading /> : (
              Object.keys(besoinsByPriorite).length === 0 ? <EmptyMini label="Aucun besoin" /> : (
                <div className="rows">
                  {Object.entries(besoinsByPriorite).map(([p, n]) => {
                    const col = p === "CRITIQUE" || p === "HAUTE" ? semantic.error : p === "MOYENNE" ? semantic.warning : semantic.success;
                    return (
                      <div key={p}>
                        <div className="row" style={{ marginBottom: 5 }}>
                          <span className="name">{p}</span>
                          <span className="val">{n}</span>
                        </div>
                        <div className="bar"><i style={{ width: `${Math.round((n / Math.max(1, besoins.length)) * 100)}%`, background: col }} /></div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Compétences les plus demandées" extra="Top 5" />
            {topDemande.length === 0 ? <EmptyMini label="Aucun signal de tension" /> : (
              <div className="rows">
                {topDemande.map((c: any, i: number) => (
                  <div className="row" key={i}>
                    <span className="rk">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.competence_nom}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{c.domaine_nom ?? "—"} · {c.nb_gaps ?? 0} gap(s)</div>
                    </div>
                    <span className="pill" style={{ background: "rgba(245,158,11,.16)", color: "#b45309" }}>{Math.round((c.score_demande ?? 0) * 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass card">
            <CardTitle title="Couverture globale" />
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Ring value={coveragePct ?? 0} color={semantic.success} size={104} suffix="%" />
              <div>
                <div className="bignum" style={{ fontSize: 26 }}>{overview?.nb_enseignants_suivis ?? NA_CALC}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>enseignants évalués</div>
              </div>
            </div>
          </div>
          <div className="glass card col-2">
            <CardTitle title="Compétences en tension" extra="Top 5 déficit" />
            {topDeficit.length === 0 ? <EmptyMini label="Aucune compétence en déficit" /> : (
              <div className="rows">
                {topDeficit.map((c: any, i: number) => (
                  <div className="row" key={i}>
                    <span className="rk" style={{ background: "rgba(239,68,68,.16)", color: "#b91c1c" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.competence_nom}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{c.domaine_nom ?? "—"}</div>
                    </div>
                    <span className="pill" style={{ background: "rgba(239,68,68,.16)", color: "#b91c1c" }}>Δ {(c.delta ?? 0).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Départements en retard de couverture" extra="Top 6 plus faibles" />
            {topDepartementsEnRetard.length === 0 ? <EmptyMini label="Aucune donnée départementale" /> : (
              <div className="rows">
                {topDepartementsEnRetard.map((dep: any) => (
                  <div key={dep.departement}>
                    <div className="row" style={{ marginBottom: 5 }}>
                      <span className="name">{dep.departement}</span>
                      <span className="val">{Math.round(dep.taux_couverture ?? 0)}%</span>
                    </div>
                    <div className="bar"><i style={{ width: `${Math.round(dep.taux_couverture ?? 0)}%`, background: semantic.success }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════ MODULE Risque & alertes ════════ */}
        <div className="mod-label">Risque & alertes</div>
        <div className="glass-grid">
          <div className="glass card">
            <CardTitle title="Enseignants à risque" />
            <div className="bignum" style={{ color: semantic.error }}>{teachersAtRisk}</div>
            <div className="muted" style={{ fontSize: 12 }}>identifiés par le moteur prédictif</div>
          </div>
          <div className="glass card">
            <CardTitle title="Sans formation récente" extra="≥ 6 mois" />
            {inactifsLoading ? <Loading /> : <>
              <div className="bignum" style={{ color: semantic.warning }}>{inactifs?.total ?? 0}</div>
              <div className="muted" style={{ fontSize: 12 }}>enseignant(s) sans suivi</div>
            </>}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Alertes" />
            <div className="rows">
              <KvRow label="Ouvertes" value={alerts?.total} color={semantic.warning} loading={alertsLoading} />
              <KvRow label="Nouvelles" value={alerts?.nouvelles} color="#6366f1" loading={alertsLoading} />
              <KvRow label="Critiques ouvertes" value={alerts?.critiques_ouvertes} color={semantic.error} loading={alertsLoading} />
            </div>
          </div>
          <div className="glass card col-4">
            <CardTitle title="Tendance du risque" extra="Enseignants à risque critique · 6 mois" />
            {riskTrendData.length === 0 ? <EmptyMini label="Aucune donnée de tendance" /> : <LineAreaChart data={riskTrendData} color={semantic.error} />}
          </div>
        </div>

        <div className="glass" style={{ marginTop: 14, borderColor: "rgba(255,255,255,.5)" }}>
          <Alert type="info" showIcon message="Analyse prédictive détaillée"
            description="Pour la liste nominative des enseignants, l'historique des alertes et les écarts par compétence/département, ouvrez l'Analyse Prédictive."
            action={<Button type="primary" size="small" onClick={() => navigate("/home/AnalysePredictive")}>Ouvrir <RightOutlined /></Button>} />
        </div>

        {/* ════════ MODULE Recommandations & impact ════════ */}
        <div className="mod-label">Recommandations & impact</div>
        <div className="glass-grid">
          <div className="glass card col-2">
            <CardTitle title="Top formations à planifier" extra={`${reclos.length} recommandation(s)`} />
            {reclos.length === 0 ? <EmptyMini label="Aucune recommandation" /> : (
              <div className="rows">
                {reclos.map((f, i) => (
                  <div className="row" key={i} style={{ cursor: "pointer" }} onClick={() => setSelectedTraining(f)}>
                    <span className="rk">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{f.recommendationCount} reco{f.avgScore != null ? ` · ${f.avgScore.toFixed(2)}` : ""}</div>
                    </div>
                    <span className="pill" style={{ background: "rgba(34,197,94,.16)", color: "#15803d" }}>{Math.round((f.successProb ?? 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="glass card col-2">
            <CardTitle title="Impact observé & santé du modèle" />
            <div className="rows">
              <KvRow label="Gain de niveau moyen" value={avgGain != null ? `+${avgGain} pts` : null} color={semantic.success} />
              <KvRow label="Complétion moyenne" value={avgCompletion == null ? null : `${avgCompletion}%`} color={semantic.success} />
              <KvRow label="Précision du modèle" value={d?.model_performance?.gap_model_accuracy != null ? `${Math.round(d.model_performance.gap_model_accuracy * 100)}%` : null} color="#6366f1" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
              <Ring value={health.score} color={healthColor} size={92} suffix="" max={100} />
              <div>
                <div className="pill" style={{ background: healthColor === semantic.success ? "rgba(34,197,94,.16)" : healthColor === semantic.warning ? "rgba(245,158,11,.16)" : "rgba(239,68,68,.16)", color: healthColor }}>
                  {health.level === "healthy" ? "Sain" : health.level === "attention" ? "Attention" : "Critique"}
                </div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 6, maxWidth: 200 }}>Basé sur couverture, besoins en attente et engagement.</div>
              </div>
            </div>
          </div>
        </div>

        <Drawer
          title={selectedTraining ? selectedTraining.title : "Détail"}
          placement="right" width={440} open={!!selectedTraining} onClose={() => setSelectedTraining(null)}
          extra={selectedTraining ? <Button type="link" onClick={() => navigate("/home/analytics/alerts")}>Centre d'action <RightOutlined /></Button> : null}
        >
          {selectedTraining && (
            <>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Recommandations">{selectedTraining.recommendationCount}</Descriptions.Item>
                <Descriptions.Item label="Score moyen">{selectedTraining.avgScore != null ? selectedTraining.avgScore.toFixed(2) : NA_CALC}</Descriptions.Item>
                <Descriptions.Item label="Réussite estimée">{Math.round((selectedTraining.successProb ?? 0) * 100)} %</Descriptions.Item>
              </Descriptions>
              <Alert style={{ marginTop: 16 }} type="info" showIcon message="Formation prioritaire"
                description="Issue du moteur de recommandation. Un score élevé et une probabilité de réussite forte indiquent un bon levier pour réduire les écarts de compétences." />
            </>
          )}
        </Drawer>
      </div>
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────────────────── */
interface Stat { label: string; value: number | string | null | undefined; hint?: string; loading?: boolean; accent?: string; }

function CardTitle({ title, extra }: { title: string; extra?: string }) {
  return (
    <div className="card-t">
      <span className="t">{title}</span>
      {extra && <span className="x">{extra}</span>}
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 24, display: "grid", placeItems: "center" }}><Spin /></div>;
}

function EmptyMini({ label }: { label: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={label} style={{ margin: "8px 0" }} />;
}

function KvRow({ label, value, color, loading }: { label: string; value: number | string | null | undefined; color: string; loading?: boolean }) {
  const display = value == null || value === "" ? NA_CALC : value;
  return (
    <div className="row kv-row">
      <span className="dotk" style={{ background: color }} />
      <span className="name muted" style={{ flex: 1 }}>{label}</span>
      <span className="val" style={{ color }}>{loading ? <Spin size="small" /> : display}</span>
    </div>
  );
}

/* ── Donut (rounded caps, hover, center subtitle) ─────────────────────── */
function Donut({ items, total }: { items: Array<{ key: string; label: string; value: number; color: string }>; total: number }) {
  const size = 160, r = 62, sw = 14, c = 2 * Math.PI * r, cx = 80, cy = 80;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,102,241,.12)" strokeWidth={sw} />
        {items.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const dash = frac * c;
          const el = (
            <circle key={s.key} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="round"
              strokeDasharray={`${Math.max(0, dash - 1.5)} ${c - Math.max(0, dash - 1.5)}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} className="donut-seg"
              style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1), stroke-width .2s" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="24" fontWeight="800" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9.5" fill="#64748b" fontWeight="600">formations</text>
      </svg>
      <div className="legend" style={{ flex: 1, minWidth: 130 }}>
        {items.map((s) => (
          <div className="li" key={s.key}>
            <span className="d" style={{ background: s.color }} />{s.label}
            <span className="val" style={{ marginLeft: "auto" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Ring (gradient stroke, track color, smooth) ──────────────────────── */
function Ring({ value, color, size = 104, suffix = "", max = 100 }: { value: number; color: string; size?: number; suffix?: string; max?: number }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, cx = size / 2, cy = size / 2;
  const frac = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const gid = `ring-${color.replace(/[^a-z0-9]/gi, "")}-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(99,102,241,.12)" strokeWidth={9} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={9} strokeLinecap="round"
        strokeDasharray={`${frac * c} ${c - frac * c}`} transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy + 1} textAnchor="middle" fontSize={suffix ? 17 : 22} fontWeight="800" fill="#0f172a" style={{ fontVariantNumeric: "tabular-nums" }}>
        {suffix ? `${Math.round(value)}${suffix}` : `${Math.round(value)}`}
      </text>
    </svg>
  );
}

/* ── SegBars (rounded, gradient, hover) ───────────────────────────────── */
function SegBars({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const sum = items.reduce((s, t) => s + t.value, 0);
  if (sum === 0) return <EmptyMini label="Aucune donnée de typage" />;
  return (
    <div className="rows">
      {items.map((t) => (
        <div key={t.label} className="seg-item">
          <div className="row" style={{ marginBottom: 6 }}>
            <span className="name">{t.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{Math.round((t.value / sum) * 100)}%</span>
            <span className="val">{t.value}</span>
          </div>
          <div className="bar"><i style={{ width: `${(t.value / sum) * 100}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color}dd)` }} /></div>
        </div>
      ))}
    </div>
  );
}

/* ── LineAreaChart (smooth bezier, hover crosshair, draw-in anim) ──────── */
function LineAreaChart({ data, color }: { data: Array<{ label: string; value: number }>; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <EmptyMini label="Aucune donnée" />;
  const W = 600, H = 210, PL = 32, PR = 16, PT = 14, PB = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4 || 4;
  const n = data.length;
  const x = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / niceMax);

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p0 = pts[i - 1], p1 = pts[i], mx = (p0.x + p1.x) / 2;
    line += ` C ${mx.toFixed(1)} ${p0.y.toFixed(1)}, ${mx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - PB} L ${x(0).toFixed(1)} ${H - PB} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => PT + (H - PT - PB) * t);
  const step = Math.max(1, Math.ceil(n / 7));
  const gid = `la-${Math.round(Math.random() * 1e6)}`;
  const lgid = `ll-${Math.round(Math.random() * 1e6)}`;
  const hoverPt = hover != null && hover < n ? pts[hover] : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}
      onMouseMove={(e) => {
        const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
        if (!rect) return;
        const px = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0, bd = Infinity;
        for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
        setHover(best);
      }}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={lgid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      {grid.map((gy, i) => (
        <line key={i} x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="rgba(99,102,241,.1)" strokeWidth={1} />
      ))}
      {grid.map((gy, i) => (
        <text key={i} x={PL - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{Math.round(niceMax * (1 - i / 4))}</text>
      ))}
      {hover != null && hoverPt && (
        <line x1={hoverPt.x} y1={PT} x2={hoverPt.x} y2={H - PB} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
      )}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={`url(#${lgid})`} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.06))" }} />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 3} fill="#fff" stroke={color} strokeWidth={2}
            style={{ transition: "r .15s ease" }} />
        </g>
      ))}
      {hover != null && hover < n && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={x(hover) - 30} y={y(data[hover].value) - 28} width="60" height="20" rx="4" fill="#0f172a" />
          <text x={x(hover)} y={y(data[hover].value) - 14} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{data[hover].value}</text>
        </g>
      )}
      {data.map((d, i) => (i % step === 0 || i === n - 1) ? (
        <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.label}</text>
      ) : null)}
    </svg>
  );
}

/* ── DeptBars (rounded, gradient, hover highlight) ────────────────────── */
function DeptBars({ departements }: { departements: AnalyticsDepartement[] }) {
  if (!departements.length) return <EmptyMini label="Aucune donnée départementale" />;
  const sorted = [...departements].sort((a, b) => (b.nombreFormationsOrganisees ?? 0) - (a.nombreFormationsOrganisees ?? 0)).slice(0, 8);
  const max = Math.max(1, ...sorted.map((d) => d.nombreFormationsOrganisees ?? 0));
  return (
    <div className="rows">
      {sorted.map((d) => {
        const v = d.nombreFormationsOrganisees ?? 0;
        return (
          <div key={d.departementId} className="dept-item">
            <div className="row" style={{ marginBottom: 5 }}>
              <span className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{d.departementNom}</span>
              <span className="val">{v}</span>
            </div>
            <div className="bar"><i style={{ width: `${(v / max) * 100}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Styles (Glassmorphism premium) ────────────────────────────────────── */
const CSS = `
.glass-page{
  --ink:#0f172a; --muted:#475569; --muted2:#94a3b8;
  --accent:${ACCENT};
  position:relative; min-height:100vh; overflow-x:hidden;
  background:linear-gradient(135deg,#e0e7ff 0%,#ede9fe 42%,#fae8ff 78%,#ffe4f3 100%);
  color:var(--ink);
}
.blob{ position:absolute; border-radius:50%; filter:blur(80px); z-index:0; pointer-events:none; }
.blob-1{ width:420px; height:420px; background:#6366f1; opacity:.45; top:-120px; left:-80px; }
.blob-2{ width:380px; height:380px; background:#ec4899; opacity:.38; bottom:-40px; right:-60px; }
.blob-3{ width:320px; height:320px; background:#22d3ee; opacity:.3; top:46%; left:42%; }
.glass-wrap{ position:relative; z-index:1; max-width:1320px; margin:0 auto; padding:30px 24px 68px; }

/* ── Top bar ─────────────────────────────────────────────────────────── */
.glass-top{ display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:26px; }
.glass-top .eyebrow{ font-size:11px; text-transform:uppercase; letter-spacing:.14em; font-weight:700; color:#6366f1; margin-bottom:4px; }
.glass-top h1{ margin:0; font-size:25px; font-weight:800; letter-spacing:-.02em; }
.grad-text{ background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 45%,#ec4899 100%); -webkit-background-clip:text; background-clip:text; color:transparent; }
.glass-top .sub{ color:var(--muted); font-size:13px; margin-top:5px; font-weight:500; }
.glass-top .right{ display:flex; align-items:center; gap:14px; }
.glass-live{ display:inline-flex; align-items:center; gap:8px; font-size:12px; color:var(--muted); font-weight:600; padding:7px 14px; background:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.6); border-radius:999px; backdrop-filter:blur(10px); }
.glass-live .dot{ width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 4px rgba(34,197,94,.2); animation:pulse 2s ease-in-out infinite; }
.glass-live .dot.err{ background:#ef4444; box-shadow:0 0 0 4px rgba(239,68,68,.2); }
@keyframes pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.5; } }
.glass-btn{ display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.6); background:rgba(255,255,255,.5); backdrop-filter:blur(10px); border-radius:12px; padding:9px 15px; font-size:13px; font-weight:600; color:#4f46e5; cursor:pointer; transition:all .22s ease; box-shadow:0 4px 16px rgba(99,102,241,.15); }
.glass-btn:hover{ background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 8px 22px rgba(139,92,246,.35); transform:translateY(-1px); }
.glass-btn:disabled{ opacity:.6; cursor:wait; }
.glass-btn svg{ margin-right:1px; }

/* ── Glass base ───────────────────────────────────────────────────────── */
.glass{
  background:rgba(255,255,255,.5);
  backdrop-filter:blur(18px) saturate(160%);
  -webkit-backdrop-filter:blur(18px) saturate(160%);
  border:1px solid rgba(255,255,255,.6);
  border-radius:18px;
  box-shadow:0 8px 32px rgba(79,70,229,.1);
}

/* ── KPI strip ────────────────────────────────────────────────────────── */
.stat-grid{ display:grid; gap:13px; grid-template-columns:repeat(auto-fit,minmax(152px,1fr)); margin-bottom:13px; }
.stat{ position:relative; padding:16px 17px; overflow:hidden; transition:all .25s ease; animation:glassIn .5s ease both; }
.stat::before{ content:""; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent-bd,var(--border)); opacity:.85; }
.stat:hover{ background:rgba(255,255,255,.68); box-shadow:0 12px 30px rgba(79,70,229,.16); transform:translateY(-3px); }
.stat .l{ font-size:11px; color:var(--muted); font-weight:600; letter-spacing:.01em; }
.stat .v{ font-size:26px; font-weight:800; margin-top:7px; letter-spacing:-.03em; font-variant-numeric:tabular-nums; line-height:1.1; }
.stat .h{ font-size:11px; color:var(--muted2); margin-top:5px; font-weight:500; }

/* ── Module labels ────────────────────────────────────────────────────── */
.mod-label{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; font-weight:700; margin:32px 0 14px; display:flex; align-items:center; gap:10px; }
.mod-label::before{ content:""; width:10px; height:10px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#ec4899); box-shadow:0 0 0 4px rgba(139,92,246,.18); }
.mod-label::after{ content:""; flex:1; height:1px; background:rgba(99,102,241,.18); }

/* ── Bento grid ───────────────────────────────────────────────────────── */
.glass-grid{ display:grid; gap:14px; grid-template-columns:1fr; }
@media(min-width:768px){ .glass-grid{ grid-template-columns:repeat(2,1fr);} .glass-grid .col-2{ grid-column:span 2;} }
@media(min-width:1280px){ .glass-grid{ grid-template-columns:repeat(4,1fr);} .glass-grid .col-2{ grid-column:span 2;} .glass-grid .col-4{ grid-column:span 4;} }

/* ── Cards ────────────────────────────────────────────────────────────── */
.card{ padding:20px 22px; display:flex; flex-direction:column; gap:14px; transition:all .25s ease; animation:glassIn .55s ease both; }
.card:hover{ background:rgba(255,255,255,.66); box-shadow:0 16px 40px rgba(79,70,229,.18); transform:translateY(-3px); }
.card-t{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.card-t .t{ font-size:14px; font-weight:700; color:var(--ink); }
.card-t .x{ font-size:11px; color:var(--muted); font-weight:500; }

/* ── Numbers & text ──────────────────────────────────────────────────── */
.bignum{ font-size:40px; font-weight:800; letter-spacing:-.04em; line-height:1; font-variant-numeric:tabular-nums; }
.muted{ color:var(--muted); }
.rows{ display:flex; flex-direction:column; gap:12px; }
.row{ display:flex; align-items:center; gap:10px; }
.row .name{ font-size:13px; color:var(--ink); font-weight:500; }
.row .val{ margin-left:auto; font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; }
.bar{ height:9px; background:rgba(99,102,241,.1); border-radius:6px; overflow:hidden; }
.bar > i{ display:block; height:100%; border-radius:6px; transition:width .7s cubic-bezier(.4,0,.2,1); }
.dotk{ width:9px; height:9px; border-radius:50%; flex-shrink:0; }
.rk{ width:26px; height:26px; border-radius:8px; display:grid; place-items:center; background:rgba(99,102,241,.14); color:#4f46e5; font-weight:700; font-size:12px; flex-shrink:0; transition:transform .2s; }
.row:hover .rk{ transform:scale(1.1); }
.pill{ display:inline-block; padding:3px 10px; border-radius:999px; font-size:11.5px; font-weight:700; font-variant-numeric:tabular-nums; }

/* ── Chart interactions ──────────────────────────────────────────────── */
.donut-seg{ transition:stroke-dasharray .8s cubic-bezier(.4,0,.2,1); cursor:pointer; }
.donut-seg:hover{ stroke-width:16; }
.seg-item, .dept-item{ padding:6px 8px; margin:-6px -8px; border-radius:8px; transition:background .2s; }
.seg-item:hover, .dept-item:hover{ background:rgba(255,255,255,.4); }
.kv-row{ padding:7px 10px; margin:-7px -10px; border-radius:8px; transition:background .2s; }
.kv-row:hover{ background:rgba(255,255,255,.4); }

/* ── Legend ───────────────────────────────────────────────────────────── */
.legend{ display:flex; flex-direction:column; gap:10px; }
.legend .li{ display:flex; align-items:center; gap:9px; font-size:12.5px; color:var(--ink); font-weight:500; }
.legend .d{ width:10px; height:10px; border-radius:4px; flex-shrink:0; box-shadow:0 0 0 2px rgba(255,255,255,.8); }

/* ── Info alert card ──────────────────────────────────────────────────── */
.glass-wrap .ant-alert{ border-radius:14px !important; background:rgba(255,255,255,.55) !important; backdrop-filter:blur(10px); }

@keyframes glassIn{ from{ opacity:0; transform:translateY(10px) scale(.99); } to{ opacity:1; transform:none; } }
@media(max-width:767px){ .glass-wrap{ padding:16px; } .glass-top h1{ font-size:21px; } .bignum{ font-size:32px; } }
`;
