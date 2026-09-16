import { memo, useMemo } from "react";
import ChartCard from "@/components/charts/ChartCard";
import BarChart from "@/components/charts/BarChart";
import { useParticipationByDept, useParticipationByUp } from "@/hooks/dashboard/useDashboardData";
import type { DashboardScope } from "@/models/dashboard";

interface Row { name: string; value: number }

const DashboardParticipationChart = memo(function DashboardParticipationChart({ scope }: { readonly scope: DashboardScope }) {
  const deptQ = useParticipationByDept(scope.isAdmin);
  const upQ = useParticipationByUp(!scope.isAdmin);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = scope.isAdmin
      ? (deptQ.data?.departements ?? []).map((d) => ({ name: d.departementNom, value: d.nombreParticipations }))
      : (upQ.data?.items ?? []).map((u) => ({ name: u.upNom, value: u.nombreParticipations }));
    out.sort((a, b) => b.value - a.value);
    return out.slice(0, 12);
  }, [scope.isAdmin, deptQ.data, upQ.data]);

  const isLoading = scope.isAdmin ? deptQ.isLoading : upQ.isLoading;

  return (
    <ChartCard
      title={scope.isAdmin ? "Participation par département" : "Participation par UP"}
      subtitle="Participations effectives (triées)"
      loading={isLoading}
      empty={!isLoading && rows.length === 0}
      emptyMessage="Aucune participation à afficher."
      height={Math.max(260, rows.length * 34)}
    >
      <BarChart
        labels={rows.map((r) => r.name)}
        values={rows.map((r) => r.value)}
        horizontal
        colorByValue
        datasetLabel="Participations"
        height={Math.max(260, rows.length * 34)}
      />
    </ChartCard>
  );
});

export default DashboardParticipationChart;
