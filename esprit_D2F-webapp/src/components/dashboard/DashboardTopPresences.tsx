import { memo, useMemo } from "react";
import { Skeleton, Tag } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import { InfoCard, EmptyState } from "@/components/ui";
import { useTopParticipants } from "@/hooks/kpi";
import type { DashboardScope } from "@/models/dashboard";

interface KpiEntry {
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  totalPresences?: number;
  deptLibelle?: string;
}

interface Props { readonly scope: DashboardScope; }

const DashboardTopPresences = memo(function DashboardTopPresences({ scope }: Props) {
  const { data: raw, isLoading } = useTopParticipants(scope.start, scope.end);

  const top10 = useMemo(() => {
    return ((raw ?? []) as KpiEntry[])
      .sort((a, b) => (b.totalPresences ?? 0) - (a.totalPresences ?? 0))
      .slice(0, 10);
  }, [raw]);

  return (
    <InfoCard title="Top présences" icon={<TrophyOutlined />}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : top10.length === 0 ? (
        <EmptyState icon={<TrophyOutlined style={{ fontSize: 28 }} />} title="Aucune donnée" compact />
      ) : (
        <div className="dash-list">
          {top10.map((entry, idx) => (
            <div key={String(entry.enseignantId ?? idx)} className="dash-list-row dash-list-row-static">
              <div className="dash-list-date" style={
                idx === 0 ? { background: "#fef9c3", borderColor: "#fde047" } :
                idx === 1 ? { background: "#f1f5f9", borderColor: "#cbd5e1" } :
                idx === 2 ? { background: "#fff7ed", borderColor: "#fdba74" } : undefined
              }>
                <b style={{
                  color: idx === 0 ? "#b45309" : idx === 1 ? "#475569" : idx === 2 ? "#c2410c" : "var(--primary-600)",
                  fontSize: idx < 3 ? 15 : 14,
                }}>{idx + 1}</b>
              </div>
              <div className="dash-list-main">
                <div className="dash-list-title">
                  {entry.nom} {entry.prenom}
                </div>
                <div className="dash-list-meta">
                  {entry.deptLibelle ?? "—"}
                </div>
              </div>
              <Tag color="green" style={{ flexShrink: 0, fontWeight: 700 }}>
                {entry.totalPresences ?? 0} présences
              </Tag>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
});

export default DashboardTopPresences;
