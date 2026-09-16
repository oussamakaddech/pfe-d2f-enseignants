import { useState, useMemo } from "react";
import { ThunderboltOutlined, PlusOutlined, DeleteOutlined, ExperimentOutlined, RightOutlined } from "@ant-design/icons";
import { Select, Button, Tag, Tooltip, Empty } from "antd";
import { useSimulateWhatIf } from "@/hooks/analyse/useAnalysePredictive";
import "@/pages/analyse/WhatIfSimulator.css";

export interface WiTeacher { teacher_id: string; teacher_name: string; departement?: string }
export interface WiCompetence { competence_id: number; competence_nom: string }

const HORIZONS = [
  { label: "3 mois", value: 3 },
  { label: "6 mois", value: 6 },
  { label: "12 mois", value: 12 },
];
const LEVELS = [1, 2, 3, 4, 5];
const U = "#6c8cff", U2 = "#9b6cff", RED = "#ff6b81", GREEN = "#34d399", AMBER = "#f5b942", CYAN = "#36e0d0", LINE = "#2a3654", BG = "#0b1020";

const RISK_THRESHOLD_HIGH = 80;
const RISK_THRESHOLD_MEDIUM = 60;
const RISK_THRESHOLD_LOW = 40;

function riskColor(score: number) {
  if (score >= RISK_THRESHOLD_HIGH) return RED;
  if (score >= RISK_THRESHOLD_MEDIUM) return AMBER;
  if (score >= RISK_THRESHOLD_LOW) return CYAN;
  return GREEN;
}

function MiniGauge({ value, color }: { readonly value: number; readonly color: string }) {
  const r = 46, cx = 60, cy = 60, circ = Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg className="wi-gauge" viewBox="0 0 120 78">
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={LINE} strokeWidth="9" strokeLinecap="round" />
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(v / 100 * Math.PI * r).toFixed(1)} ${circ.toFixed(1)}`}
        style={{ transition: "stroke-dasharray .7s cubic-bezier(.22,1,.36,1), stroke .4s" }} />
      <text x={cx} y={cy - 8} textAnchor="middle" className="wi-gauge-num" fill={color}>{Math.round(v)}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="wi-gauge-lbl">score</text>
    </svg>
  );
}

export default function WhatIfSimulator({
  teachers, competences, defaultTeacherId,
}: {
  readonly teachers: WiTeacher[];
  readonly competences: WiCompetence[];
  readonly defaultTeacherId?: string | null;
}) {
  const [teacherId, setTeacherId] = useState<string | null>(defaultTeacherId ?? teachers[0]?.teacher_id ?? null);
  const [horizon, setHorizon] = useState(6);
  const [plan, setPlan] = useState<{ competence_id: number; niveau_vise: number }[]>([]);
  const sim = useSimulateWhatIf();

  const compOptions = useMemo(
    () => competences.map((c) => ({ value: c.competence_id, label: c.competence_nom })),
    [competences],
  );
  const usedIds = useMemo(() => new Set(plan.map((p) => p.competence_id)), [plan]);

  const addRow = (competence_id: number) => {
    if (!competence_id || usedIds.has(competence_id)) return;
    setPlan((p) => [...p, { competence_id, niveau_vise: 4 }]);
  };
  const setLevel = (i: number, niveau_vise: number) =>
    setPlan((p) => p.map((x, k) => (k === i ? { ...x, niveau_vise } : x)));
  const remove = (i: number) => setPlan((p) => p.filter((_, k) => k !== i));

  const run = () => {
    if (!teacherId || !plan.length) return;
    sim.mutate({ enseignant_id: teacherId, plan, horizon_mois: horizon });
  };

  const res = sim.data;
  const before = res?.risk_before.score ?? null;
  const after = res?.risk_after.score ?? null;
  const redPct = res && before != null && after != null ? Math.max(0, ((before - after) / Math.max(before, 1)) * 100) : 0;

  return (
    <div className="wi-root">
      <div className="wi-builder">
        <div className="wi-field">
          <label htmlFor="wi-teacher">Enseignant</label>
          <Select
            id="wi-teacher"
            showSearch optionFilterProp="label" value={teacherId ?? undefined}
            onChange={(v) => setTeacherId(v)} className="wi-select"
            options={teachers.map((t) => ({ value: t.teacher_id, label: `${t.teacher_name}${t.departement ? " · " + t.departement : ""}` }))}
            placeholder="Choisir un enseignant" />
        </div>

        <div className="wi-field">
          <label htmlFor="wi-horizon">Horizon de projection</label>
          <div className="wi-seg" id="wi-horizon">
            {HORIZONS.map((h) => (
              <button key={h.value} className={horizon === h.value ? "is-on" : ""} onClick={() => setHorizon(h.value)}>{h.label}</button>
            ))}
          </div>
        </div>

        <div className="wi-field wi-grow">
          <label htmlFor="wi-plan">Plan de formation ciblé</label>
          <div className="wi-plan" id="wi-plan">
            {plan.length === 0 && <span className="wi-empty">Ajoutez des compétences à cibler ↓</span>}
            {plan.map((p, i) => {
              const c = competences.find((x) => x.competence_id === p.competence_id);
              return (
                <div className="wi-plan-row" key={p.competence_id}>
                  <span className="wi-plan-name">{c?.competence_nom ?? `#${p.competence_id}`}</span>
                  <div className="wi-levels">
                    {LEVELS.map((l) => (
                      <button key={l} className={p.niveau_vise === l ? "is-on" : ""} onClick={() => setLevel(i, l)}>{l}</button>
                    ))}
                  </div>
                  <Tooltip title="Retirer"><button className="wi-del" onClick={() => remove(i)}><DeleteOutlined /></button></Tooltip>
                </div>
              );
            })}
          </div>
          <div className="wi-add">
            <Select
              showSearch optionFilterProp="label" placeholder="Ajouter une compétence…"
              className="wi-select" value={null} onChange={addRow}
              options={compOptions.filter((o) => !usedIds.has(o.value as number))} suffixIcon={<PlusOutlined />} />
          </div>
        </div>

        <div className="wi-run">
          <Button
            type="primary" icon={<ThunderboltOutlined />} onClick={run}
            disabled={!teacherId || !plan.length || sim.isPending}
            className="wi-run-btn">
            {sim.isPending ? "Simulation…" : "Simuler l'impact"}
          </Button>
        </div>
      </div>

      {sim.isError && <div className="wi-error">Échec de la simulation. Vérifiez que le modèle est entraîné.</div>}

      {res && (
        <div className="wi-result">
          <div className="wi-result-head">
            <span className="wi-result-title"><ExperimentOutlined /> Impact projeté · {horizon} mois</span>
            <Tag color={redPct > 0 ? "green" : "default"} className="wi-reduction">
              {redPct > 0 ? `−${redPct.toFixed(0)}% risque` : "aucune réduction"}
            </Tag>
          </div>

          <div className="wi-gauges">
            <div className="wi-gauge-box">
              <MiniGauge value={before ?? 0} color={riskColor(before ?? 0)} />
              <span className="wi-gauge-cap">Avant</span>
            </div>
            <div className="wi-arrow"><RightOutlined /></div>
            <div className="wi-gauge-box">
              <MiniGauge value={after ?? 0} color={riskColor(after ?? 0)} />
              <span className="wi-gauge-cap">Après plan</span>
            </div>
            <div className="wi-stats">
              <div className="wi-stat"><b>{res.nb_gaps_resolus}</b><span>gaps résolus</span></div>
              <div className="wi-stat"><b>{res.nb_gaps_before - res.nb_gaps_after}</b><span>gaps réduits</span></div>
              <div className="wi-stat"><b>{Math.round((after ?? 0))}</b><span>score final</span></div>
            </div>
          </div>

          <div className="wi-details">
            {res.details.map((d) => (
              <div className="wi-detail" key={d.competence_id}>
                <span className="wi-detail-name">#{d.competence_id}</span>
                <span className="wi-gap">{d.gap_avant.toFixed(1)}</span>
                <RightOutlined className="wi-detail-ar" />
                <span className="wi-gap wi-after">{d.gap_apres.toFixed(1)}</span>
                <Tag className="wi-urgen" color={d.resolu ? "green" : "orange"}>
                  {d.resolu ? "Résolu" : d.urgence_apres}
                </Tag>
              </div>
            ))}
          </div>
        </div>
      )}

      {!res && !sim.isError && !sim.isPending && (
        <div className="wi-placeholder"><Empty description="Construisez un plan puis lancez la simulation" /></div>
      )}
    </div>
  );
}
