import type { CSSProperties } from "react";
import type { PriorityAction } from "@/models/analyse";
import { getRiskScore, riskLevel, RISK_LABELS, RISK_COLORS } from "@/redesign/risk";
import { initialsFromName } from "@/redesign/format";
import { ListSkeleton, EmptyState } from "./States";

function avatarColor(seed: string): string {
  const palette = ["#b51200", "#7c3aed", "#0891b2", "#2563eb", "#059669", "#d97706", "#db2777"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const TREND_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  PROGRESSION: { icon: "↗", color: "var(--rd-error)", label: "En progression" },
  REGRESSION: { icon: "↘", color: "var(--rd-success)", label: "En régression" },
  STABLE: { icon: "→", color: "var(--rd-text-3)", label: "Stable" },
};

export default function AtRiskTeachersTable({
  teachers,
  loading,
}: {
  teachers: PriorityAction[];
  loading: boolean;
}) {
  if (loading && teachers.length === 0) return <ListSkeleton rows={5} />;
  if (teachers.length === 0) return <EmptyState description="Aucun enseignant à risque détecté" />;

  return (
    <div className="rd-artable">
      <div className="rd-artable-head">
        <div className="rd-artable-col rd-artable-col--name">Enseignant</div>
        <div className="rd-artable-col rd-artable-col--dept">Compétence prioritaire</div>
        <div className="rd-artable-col rd-artable-col--score">Score</div>
        <div className="rd-artable-col rd-artable-col--trend">Tendance</div>
        <div className="rd-artable-col rd-artable-col--signals">Gaps</div>
        <div className="rd-artable-col rd-artable-col--action">Action recommandée</div>
        <div className="rd-artable-col rd-artable-col--history">Historique</div>
        <div className="rd-artable-col rd-artable-col--formation">Dernière formation</div>
      </div>
      {teachers.map((t) => {
        const score = getRiskScore({ score_risque: t.score_risque });
        const level = score != null ? riskLevel(score) : null;
        const trend = t.tendance ? TREND_ICONS[t.tendance] : null;
        const hist = t.historique;
        const prevScore = hist?.score_precedent != null ? Math.round(hist.score_precedent * 100) : null;
        const currScore = score != null ? Math.round(score * 100) : null;
        const evoUp = prevScore != null && currScore != null ? currScore > prevScore : null;
        const evoColor =
          evoUp == null ? "var(--rd-text-3)"
          : evoUp ? "var(--rd-error)"
          : "var(--rd-success)";
        return (
          <div
            key={t.enseignant_id}
            className="rd-artable-row"
            style={level ? ({ ["--row-accent"]: RISK_COLORS[level] } as CSSProperties) : undefined}
          >
            <div className="rd-artable-col rd-artable-col--name">
              <div className="rd-avatar sm" style={{ background: avatarColor(t.enseignant_id) }}>
                {initialsFromName(t.teacher_name ?? t.enseignant_id, "?")}
              </div>
              <div>
                <div className="rd-artable-name">{t.teacher_name ?? t.enseignant_id}</div>
                <div className="rd-artable-id">{t.enseignant_id}</div>
              </div>
            </div>
            <div className="rd-artable-col rd-artable-col--dept">
              {t.competence_prioritaire?.competence_nom ?? "—"}
            </div>
            <div className="rd-artable-col rd-artable-col--score">
              {score != null ? (
                <span className="rd-risk sm" style={{ color: RISK_COLORS[level!], background: `${RISK_COLORS[level!]}1f` }}>
                  <span className="rd-risk-dot" style={{ background: RISK_COLORS[level!] }} />
                  {Math.round(score * 100)} % · {RISK_LABELS[level!]}
                </span>
              ) : (
                <span className="rd-muted">—</span>
              )}
            </div>
            <div className="rd-artable-col rd-artable-col--trend">
              {trend ? (
                <span style={{ color: trend.color, fontWeight: 700, fontSize: 16 }} title={trend.label}>
                  {trend.icon}
                </span>
              ) : (
                <span className="rd-muted">—</span>
              )}
            </div>
            <div className="rd-artable-col rd-artable-col--signals">
              <div className="rd-artable-signals">
                {t.nb_gaps_critiques > 0 && (
                  <span className="rd-signal" style={{ color: "var(--rd-error)", background: "var(--rd-error-bg)" }}>
                    <span aria-hidden>⚠</span> {t.nb_gaps_critiques} critique{t.nb_gaps_critiques > 1 ? "s" : ""}
                  </span>
                )}
                {t.nb_alertes_ouvertes > 0 && (
                  <span className="rd-signal" style={{ color: "var(--rd-warning)", background: "var(--rd-warning-bg)" }}>
                    <span aria-hidden>🔔</span> {t.nb_alertes_ouvertes} alerte{t.nb_alertes_ouvertes > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="rd-artable-col rd-artable-col--action">
              <span className="rd-artable-action">{t.action_recommandee}</span>
            </div>
            <div className="rd-artable-col rd-artable-col--history">
              <div className="rd-arthist">
                {prevScore != null && currScore != null ? (
                  <span className="rd-arthist-evo" style={{ color: evoColor }}>
                    {prevScore}% → {currScore}%
                  </span>
                ) : (
                  <span className="rd-arthist-evo rd-muted">—</span>
                )}
                <span className="rd-arthist-meta">{Math.round(hist?.taux_completion ?? 0)}% complétion</span>
                {hist?.nb_mois_stagnation ? (
                  <span className="rd-arthist-meta">{hist.nb_mois_stagnation} mois stagnation</span>
                ) : null}
              </div>
            </div>
            <div className="rd-artable-col rd-artable-col--formation">
              {t.derniere_formation ? (
                <div className="rd-artable-form">
                  <span className="rd-artable-form-titre">{t.derniere_formation.formation_titre}</span>
                  {t.derniere_formation.date && (
                    <span className="rd-artable-form-date">{fmtDate(t.derniere_formation.date)}</span>
                  )}
                </div>
              ) : (
                <span className="rd-muted">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
