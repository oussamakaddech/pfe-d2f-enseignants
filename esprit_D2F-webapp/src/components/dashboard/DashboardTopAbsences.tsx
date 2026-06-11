import { memo, useMemo } from "react";
import { Skeleton, Tag } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { InfoCard, EmptyState } from "@/components/ui";
import { useTopAbsentees } from "@/hooks/kpi";
import type { DashboardScope } from "@/models/dashboard";

interface KpiEntry {
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  totalPresences?: number;
  deptLibelle?: string;
}

interface Props { readonly scope: DashboardScope; }

const DashboardTopAbsences = memo(function DashboardTopAbsences({ scope }: Props) {
  const { data: raw, isLoading } = useTopAbsentees(scope.start, scope.end);

  const top10 = useMemo(() => {
    return ((raw ?? []) as KpiEntry[])
      .sort((a, b) => (b.totalPresences ?? 0) - (a.totalPresences ?? 0))
      .slice(0, 10);
  }, [raw]);

  return (
    <InfoCard title="Top absences" icon={<WarningOutlined />}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : top10.length === 0 ? (
        <EmptyState icon={<WarningOutlined style={{ fontSize: 28 }} />} title="Aucune donnée" compact />
      ) : (
        <div className="dash-list">
          {top10.map((entry, idx) => (
            <div key={String(entry.enseignantId ?? idx)} className="dash-list-row dash-list-row-static">
              <div
                className="dash-list-date"
                style={{ background: "#fef2f2", borderColor: "#fecaca" }}
              >
                <b style={{ color: "#ef4444" }}>{idx + 1}</b>
              </div>
              <div className="dash-list-main">
                <div className="dash-list-title">
                  {entry.nom} {entry.prenom}
                </div>
                <div className="dash-list-meta">
                  {entry.deptLibelle ?? "—"}
                </div>
              </div>
              <Tag color="red" style={{ flexShrink: 0, fontWeight: 700 }}>
                {entry.totalPresences ?? 0} absences
              </Tag>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
});

export default DashboardTopAbsences;
