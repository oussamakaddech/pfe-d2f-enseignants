import { memo } from "react";
import ChartCard from "@/components/charts/ChartCard";
import DonutChart from "@/components/charts/DonutChart";
import { useFormationsByEtat } from "@/hooks/kpi";
import type { FormationsByEtat } from "@/models/analyse/kpi";
import type { DashboardScope } from "@/models/dashboard";

const DashboardStatusChart = memo(function DashboardStatusChart({ scope }: { readonly scope: DashboardScope }) {
  const { data, isLoading } = useFormationsByEtat(scope.start, scope.end);
  const d = (data as FormationsByEtat | undefined) ?? { enregistre: 0, planifie: 0, enCours: 0, acheve: 0, annule: 0, total: 0 };

  const slices = [
    { label: "Planifiée", value: d.planifie, color: "#3b82f6" },
    { label: "En cours", value: d.enCours, color: "#f59e0b" },
    { label: "Achevée", value: d.acheve, color: "#10b981" },
    { label: "Annulée", value: d.annule, color: "#ef4444" },
    { label: "Enregistrée", value: d.enregistre, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  return (
    <ChartCard
      title="Répartition par statut"
      subtitle="Pipeline des formations"
      loading={isLoading}
      empty={!isLoading && slices.length === 0}
      emptyMessage="Aucune formation à répartir."
      height={300}
    >
      <DonutChart slices={slices} centerLabel={`${d.total}`} height={280} />
    </ChartCard>
  );
});

export default DashboardStatusChart;
