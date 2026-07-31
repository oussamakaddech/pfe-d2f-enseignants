import { useMemo, useState } from "react";
import { Card, Table, Tag, Button, InputNumber, Checkbox, Space, Statistic, Empty, Spin, Alert, Progress, Typography } from "antd";
import { ThunderboltOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useWhatIfSimulation } from "@/hooks/analytics/useAnalyticsQueries";
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from "@/utils/analytics/constants";
import type { Recommendation, SkillGap, WhatIfResponse } from "@/models/analyse/analyticsFeature";

interface Props {
  readonly enseignantId: string;
  readonly gaps: SkillGap[];
  readonly recommendations: Recommendation[];
}

const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

/** Déduplique les gaps par competence_id (garde le plus critique). */
function deduplicateGaps(gaps: SkillGap[]): SkillGap[] {
  const map = new Map<number, SkillGap>();
  for (const g of gaps) {
    const existing = map.get(g.competence_id);
    if (!existing || g.gap_score > existing.gap_score) map.set(g.competence_id, g);
  }
  return Array.from(map.values());
}

export default function ImpactPanel({ enseignantId, gaps, recommendations }: Props) {
  const sim = useWhatIfSimulation(enseignantId);
  const uniqueGaps = useMemo(() => deduplicateGaps(gaps), [gaps]);

  const [selected, setSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(uniqueGaps.map((g) => [g.competence_id, true])),
  );
  const [niveaux, setNiveaux] = useState<Record<number, number>>(() =>
    Object.fromEntries(uniqueGaps.map((g) => [g.competence_id, g.niveau_requis])),
  );

  const formationParCompetence = useMemo(() => {
    const m = new Map<number, Recommendation>();
    recommendations.forEach((r) => {
      if (r.competence_id && !m.has(r.competence_id)) m.set(r.competence_id, r);
    });
    return m;
  }, [recommendations]);

  const rows = uniqueGaps.map((g) => ({
    gap: g,
    formation: formationParCompetence.get(g.competence_id),
  }));

  const selectedCount = rows.filter((r) => selected[r.gap.competence_id]).length;

  const run = () => {
    const plan = uniqueGaps
      .filter((g) => selected[g.competence_id])
      .map((g) => ({
        competence_id: g.competence_id,
        niveau_vise: niveaux[g.competence_id] ?? g.niveau_requis,
        formation_id: formationParCompetence.get(g.competence_id)?.formation_id ?? null,
      }));
    if (!plan.length) return;
    sim.mutate({ plan, horizon_mois: 6 });
  };

  const res: WhatIfResponse | undefined = sim.data;

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 10 }}
        message="Impact attendu d'une formation recommandée"
        description="Sélectionnez les compétences à couvrir et le niveau visé. La simulation estime la baisse de risque et la réduction des écarts « comme si » le plan était suivi."
      />

      <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }} title="Plan de formation projeté">
        {rows.length === 0 ? (
          <Empty description="Aucun gap — lancez une analyse" />
        ) : (
          <>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space>
                <Checkbox
                  checked={selectedCount === rows.length}
                  indeterminate={selectedCount > 0 && selectedCount < rows.length}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelected(Object.fromEntries(rows.map((r) => [r.gap.competence_id, checked])));
                  }}
                >
                  Tout sélectionner
                </Checkbox>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedCount}/{rows.length} compétence(s)
                </Typography.Text>
              </Space>
            </div>
            <Table
              size="small"
              pagination={false}
              rowKey={(r) => r.gap.competence_id}
              dataSource={rows}
              columns={[
                {
                  title: "Compétence",
                  dataIndex: ["gap", "competence_nom"],
                  render: (_: unknown, r: { gap: SkillGap }) => (
                    <Space>
                      <Checkbox
                        checked={selected[r.gap.competence_id]}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [r.gap.competence_id]: e.target.checked }))
                        }
                      />
                      <span>
                        {r.gap.competence_nom}
                        {r.gap.niveau_actuel === 0 && <Tag color="red" style={{ marginLeft: 4 }}>Manquante</Tag>}
                      </span>
                    </Space>
                  ),
                },
                {
                  title: "Actuel → Requis",
                  dataIndex: ["gap", "niveau_actuel"],
                  render: (_: unknown, r: { gap: SkillGap }) => (
                    <Tag color={r.gap.niveau_actuel === 0 ? "red" : "default"}>
                      N{r.gap.niveau_actuel} → N{r.gap.niveau_requis}
                    </Tag>
                  ),
                },
                {
                  title: "Niveau visé",
                  dataIndex: ["gap", "competence_id"],
                  render: (_: unknown, r: { gap: SkillGap }) => (
                    <InputNumber
                      min={1}
                      max={5}
                      value={niveaux[r.gap.competence_id]}
                      onChange={(v) => setNiveaux((s) => ({ ...s, [r.gap.competence_id]: (v as number) ?? r.gap.niveau_requis }))}
                      disabled={!selected[r.gap.competence_id]}
                    />
                  ),
                },
                {
                  title: "Formation liée",
                  dataIndex: ["formation", "formation_titre"],
                  render: (_: unknown, r: { gap: SkillGap; formation?: Recommendation }) =>
                    r.formation ? (
                      <span>{r.formation.formation_titre}</span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    ),
                },
              ]}
            />
          </>
        )}
        <Space style={{ marginTop: 12 }}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={sim.isPending}
            disabled={rows.length === 0 || selectedCount === 0}
            onClick={run}
          >
            Simuler l'impact
          </Button>
          {sim.isError && <span style={{ color: "#f5222d" }}>Échec de la simulation</span>}
        </Space>
      </Card>

      {sim.isPending && <Spin style={{ display: "block", margin: "24px auto" }} />}

      {res && (
        <Card size="small" style={{ borderRadius: 12 }} title="Résultat de la simulation">
          <Space size="large" wrap style={{ marginBottom: 16 }}>
            <Statistic
              title="Risque avant"
              value={fmtPct(res.risk_before.score)}
              valueStyle={{ color: RISK_LEVEL_COLORS[(res.risk_before.niveau as keyof typeof RISK_LEVEL_COLORS) ?? "ELEVE"] }}
            />
            <ArrowRightOutlined style={{ fontSize: 18, color: "#94a3b8", marginTop: 28 }} />
            <Statistic
              title="Risque après"
              value={fmtPct(res.risk_after.score)}
              valueStyle={{ color: RISK_LEVEL_COLORS[(res.risk_after.niveau as keyof typeof RISK_LEVEL_COLORS) ?? "FAIBLE"] }}
            />
            <Statistic title="Baisse de risque" value={fmtPct(res.risk_reduction)} valueStyle={{ color: "#52c41a" }} />
            <Statistic title="Écarts résolus" value={`${res.nb_gaps_resolus} / ${res.nb_gaps_before}`} />
          </Space>

          <Progress
            percent={Math.round(res.risk_reduction * 100)}
            status="active"
            strokeColor="#52c41a"
            format={(p) => `−${p}% risque`}
          />

          <Table
            size="small"
            pagination={false}
            style={{ marginTop: 12 }}
            rowKey={(d) => d.competence_id}
            dataSource={res.details}
            columns={[
              { title: "Compétence", dataIndex: "competence_id", render: (id: number) => gaps.find((g) => g.competence_id === id)?.competence_nom ?? `#${id}` },
              {
                title: "Niveau",
                render: (_: unknown, d: WhatIfResponse["details"][number]) => (
                  <Tag color={d.resolu ? "green" : "orange"}>
                    N{d.niveau_actuel} → N{d.niveau_vise}
                  </Tag>
                ),
              },
              {
                title: "Écart avant → après",
                render: (_: unknown, d: WhatIfResponse["details"][number]) => (
                  <span>
                    {fmtPct(d.gap_avant)} → {fmtPct(d.gap_apres)}
                  </span>
                ),
              },
              {
                title: "Statut",
                dataIndex: "resolu",
                render: (ok: boolean) => (
                  <Tag color={ok ? "green" : "default"}>{ok ? "Écart résolu" : "Réduit"}</Tag>
                ),
              },
            ]}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            Horizon de projection : {res.horizon_mois} mois · Niveau après :{" "}
            {RISK_LEVEL_LABELS[(res.risk_after.niveau as keyof typeof RISK_LEVEL_LABELS) ?? "FAIBLE"]}
          </div>
        </Card>
      )}
    </div>
  );
}
