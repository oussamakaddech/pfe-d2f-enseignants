import { useState } from "react";
import { Section, Card } from "@/redesign/components/Section";
import CompactKpi from "@/redesign/components/CompactKpi";
import { KpiSkeleton, ErrorState } from "@/redesign/components/States";
import {
  useTrainingImpact, useTrainingImpactFormations, useSupplyDemand,
} from "@/hooks/analyse/useAnalysePredictive";
import { useDetectAnomaliesDepartment } from "@/hooks/analyse/useNewFeatures";
import {
  RiseOutlined, FallOutlined, ExperimentOutlined, NodeIndexOutlined,
  WarningOutlined, ScanOutlined, CheckCircleOutlined,
} from "@ant-design/icons";
import { Table, Tag, Progress, Button, Empty, Alert, message as antdMessage } from "antd";
import "@/redesign/redesign.css";

const QUADRANT_COLOR: Record<string, string> = {
  CRITIQUE: "error",
  PENURIE: "warning",
  SURVEILLER: "processing",
  SAINE: "success",
};

/**
 * Nouvelles fonctionnalités de la page Analyse Prédictive :
 *  - Impact réel des formations suivies (mesuré en base)
 *  - Matrice Offre vs Demande (quadrants de pression compétence)
 *  - Scan d'anomalies en direct (moteur d'anomalie, déclenchable)
 */
export default function NewFeaturesSection({ departementId }: { readonly departementId?: string | null }) {
  const impact = useTrainingImpact();
  const impactFormations = useTrainingImpactFormations(0, 6);
  const supply = useSupplyDemand();
  const scanDept = useDetectAnomaliesDepartment();

  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const handleScan = async () => {
    try {
      const target = departementId ?? "ALL";
      const res = await scanDept.mutateAsync(target);
      setScanMsg(
        `Scan terminé : ${res.nb_anomalies} anomalie(s) détectée(s) sur ${res.nb_enseignants_scannes} enseignant(s).`
      );
      antdMessage.success("Scan d'anomalies terminé.");
    } catch {
      antdMessage.error("Échec du scan d'anomalies.");
    }
  };

  return (
    <>
      {/* ── 1. IMPACT RÉEL DES FORMATIONS ─────────────────────── */}
      <Section
        title="Impact réel des formations"
        subtitle="Gain de niveau et réduction du risque mesurés après les formations effectivement suivies"
      >
        {impact.isLoading && <KpiSkeleton count={4} />}
        {impact.isError && (
          <ErrorState message="Erreur de chargement de l'impact." onRetry={() => impact.refetch()} />
        )}
        {impact.data && (
          <>
            <div className="rd-kpi-grid">
              <CompactKpi
                label="Gain de niveau moyen"
                value={impact.data.gain_niveau_moyen}
                unit="custom"
                customText={impact.data.gain_niveau_moyen.toFixed(2)}
                icon={<RiseOutlined />}
                accent="#52c41a"
                accentBg="rgba(82,196,26,0.10)"
              />
              <CompactKpi
                label="Réduction du risque"
                value={impact.data.reduction_risque_moyenne}
                unit="custom"
                customText={`${Math.round(impact.data.reduction_risque_moyenne * 100)} %`}
                icon={<FallOutlined />}
                accent="#1677ff"
                accentBg="rgba(22,119,255,0.10)"
              />
              <CompactKpi
                label="Profils améliorés"
                value={impact.data.nb_risque_reduit}
                unit="int"
                icon={<CheckCircleOutlined />}
                accent="#722ed1"
                accentBg="rgba(114,46,209,0.10)"
                helper={`${impact.data.nb_risque_augmente} en dégradation`}
              />
              <CompactKpi
                label="Formations suivies"
                value={impact.data.nb_formations_suivies}
                unit="int"
                icon={<ExperimentOutlined />}
                accent="#faad14"
                accentBg="rgba(250,173,21,0.10)"
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Card title="Top formations par impact mesuré" icon={<RiseOutlined />}>
                {(() => {
                  if (impactFormations.isLoading) return <Empty description="Chargement…" />;
                  if (impactFormations.data?.formations.length === 0) return <Empty description="Aucune formation suivie à évaluer" />;
                  return (
                  <Table
                    rowKey="formation_id"
                    size="small"
                    pagination={false}
                    dataSource={impactFormations.data?.formations ?? []}
                    columns={[
                      { title: "Formation", dataIndex: "formation_titre", key: "formation_titre" },
                      { title: "Enseignants", dataIndex: "nb_enseignants", key: "nb_enseignants", width: 110 },
                      {
                        title: "Gain moyen", key: "gain_niveau_moyen", width: 120,
                        render: (_: unknown, f: { niveau_moyen_avant: number; niveau_moyen_apres: number }) => (
                          <Tag color="success">+{(f.niveau_moyen_apres - f.niveau_moyen_avant).toFixed(2)}</Tag>
                        ),
                      },
                    ]}
                  />
                  );
                })()}
              </Card>
            </div>
          </>
        )}
      </Section>

      {/* ── 2. MATRICE OFFRE vs DEMANDE ─────────────────────── */}
      <Section
        title="Matrice Offre vs Demande"
        subtitle="Pression sur les compétences : demande exprimée, offre disponible et quadrants d'action"
      >
        {supply.isLoading && <KpiSkeleton count={3} />}
        {supply.isError && (
          <ErrorState message="Erreur de chargement de l'offre/demande." onRetry={() => supply.refetch()} />
        )}
        {supply.data && (
          <div className="rd-grid-2">
            <Card title="Répartition par quadrant" icon={<NodeIndexOutlined />}>
              {supply.data.length === 0 ? (
                <Empty description="Aucune donnée" />
              ) : (
                <div className="glass-list">
                  {(["CRITIQUE", "PENURIE", "SURVEILLER", "SAINE"] as const).map((q) => {
                    const items = supply.data.filter((s) => s.quadrant === q);
                    return (
                      <div key={q} className="glass-list-item">
                        <Tag color={QUADRANT_COLOR[q]}>{q}</Tag>
                        <span className="li-sub">{items.length} compétence(s)</span>
                        <span className="glass-chip" style={{ color: "var(--rd-muted)" }}>
                          {items.slice(0, 2).map((i) => i.competence_nom).join(", ") || "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card title="Compétences sous pression" icon={<WarningOutlined />}>
              {supply.data.length === 0 ? (
                <Empty description="Aucune donnée" />
              ) : (
                <div className="glass-list">
                  {[...supply.data]
                    .sort((a, b) => b.demand_score - a.demand_score)
                    .slice(0, 8)
                    .map((s) => (
                      <div key={s.competence_id} className="glass-list-item">
                        <div className="li-main">
                          <div className="li-title">{s.competence_nom}</div>
                          <div className="li-sub">{s.domaine_nom} · {s.nb_enseignants} ens.</div>
                        </div>
                        <Tag color={QUADRANT_COLOR[s.quadrant] ?? "default"}>{s.quadrant}</Tag>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </Section>

      {/* ── 3. SCAN ANOMALIES EN DIRECT ─────────────────────── */}
      <Section
        title="Scan d'anomalies en direct"
        subtitle="Déclenche le moteur de détection (chutes de niveau, régressions, sursauts de gaps) sur un périmètre"
        extra={
          <Button
            type="primary"
            icon={<ScanOutlined />}
            loading={scanDept.isPending}
            onClick={handleScan}
          >
            Lancer le scan
          </Button>
        }
      >
        {scanMsg && (
          <Alert type="success" showIcon message={scanMsg} style={{ marginBottom: 12 }} />
        )}
        <Card title="Pourquoi scanner ?" icon={<WarningOutlined />}>
          <p className="rd-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Le moteur compare l'état courant des enseignants à leur historique de snapshots et
            signale les déviations significatives (seuil de chute configurable). Les anomalies
            ouvertes alimentent ensuite le centre de surveillance et les alertes.
          </p>
          <Progress percent={scanDept.isPending ? 60 : 100} showInfo={false} strokeColor="#ff4d4f" />
        </Card>
      </Section>
    </>
  );
}
