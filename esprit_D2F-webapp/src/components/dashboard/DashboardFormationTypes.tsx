import { memo, useMemo } from "react";
import { Skeleton } from "antd";
import { HomeOutlined, GlobalOutlined, DesktopOutlined } from "@ant-design/icons";
import { InfoCard, EmptyState } from "@/components/ui";
import { useKpiFormationsByTypeFiltered } from "@/hooks/kpi";
import type { DashboardScope } from "@/models/dashboard";

const TYPE_CONFIG = [
  { key: "interne",  label: "Interne",  sub: "formations internes",   icon: <HomeOutlined />,    color: "#b51200", bg: "#fff0ee", border: "#ffc5be" },
  { key: "externe",  label: "Externe",  sub: "formations externes",   icon: <GlobalOutlined />,  color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "enLigne",  label: "En ligne", sub: "formations en ligne",   icon: <DesktopOutlined />, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
] as const;

interface Props { readonly scope: DashboardScope; }

const DashboardFormationTypes = memo(function DashboardFormationTypes({ scope }: Props) {
  const filters = useMemo(
    () => ({ start: scope.start, end: scope.end }),
    [scope.start, scope.end],
  );
  const { data: raw, isLoading, isError } = useKpiFormationsByTypeFiltered(filters);
  const counts = raw as Record<string, number> | null | undefined;

  return (
    <InfoCard title="Formations par type" icon={<DesktopOutlined />}>
      {(() => {
        if (isLoading) return (
        <Skeleton active paragraph={{ rows: 2 }} />
        );
        if (isError || !counts) return (
        <EmptyState icon={<DesktopOutlined style={{ fontSize: 28 }} />} title="Aucune donnée" compact />
        );
        return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {TYPE_CONFIG.map(({ key, label, sub, icon, color, bg, border }) => (
            <div
              key={key}
              style={{
                padding: "16px 14px",
                background: bg,
                borderRadius: "var(--radius-md)",
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22, color, flexShrink: 0 }}>{icon}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--neutral-900)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  {(counts[key] ?? 0).toLocaleString("fr-FR")}
                </div>
                <div style={{ fontSize: 11, color: "var(--neutral-500)", marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardFormationTypes;
