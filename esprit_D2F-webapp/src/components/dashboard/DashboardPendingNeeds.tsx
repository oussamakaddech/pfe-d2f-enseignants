import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton, Tag, Button } from "antd";
import { BellOutlined, RightOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { InfoCard, EmptyState } from "@/components/ui";
import { useBesoins, useMyBesoins } from "@/hooks/besoin/useBesoins";
import { isPendingBesoin } from "@/services/dashboard/dashboardService";
import type { BesoinFormation } from "@/models/besoin";
import type { DashboardScope } from "@/models/dashboard";

const PRIORITE_COLOR: Record<string, string> = {
  CRITIQUE: "red", HAUTE: "volcano", MOYENNE: "gold", BASSE: "default",
};

const DashboardPendingNeeds = memo(function DashboardPendingNeeds({ scope }: { readonly scope: DashboardScope }) {
  const navigate = useNavigate();
  // ADMIN voit tous les besoins ; les autres rôles ne voient que les leurs (scope respecté).
  const all = useBesoins(scope.isAdmin);
  const mine = useMyBesoins(!scope.isAdmin);
  const src = scope.isAdmin ? all : mine;

  const pending = useMemo<BesoinFormation[]>(
    () => (src.data ?? []).filter(isPendingBesoin).slice(0, 5),
    [src.data],
  );

  return (
    <InfoCard
      title="Besoins à traiter"
      icon={<BellOutlined />}
      footer={<Button type="link" style={{ paddingInline: 0 }} onClick={() => navigate("/home/besoins")}>Tous les besoins <RightOutlined /></Button>}
    >
      {(() => {
        if (src.isLoading) return (
        <Skeleton active paragraph={{ rows: 4 }} />
        );
        if (pending.length === 0) return (
        <EmptyState icon={<CheckCircleOutlined style={{ color: "var(--color-success)", fontSize: 32 }} />} title="Aucun besoin en attente" compact />
        );
        return (
        <div className="dash-list">
          {pending.map((b) => {
            const prio = (b.priorite ?? "").toString().toUpperCase();
            return (
              <button key={String(b.idBesoinFormation ?? b.titre)} type="button" className="dash-list-row" onClick={() => navigate("/home/besoins")}>
                <div className="dash-list-main">
                  <div className="dash-list-title">{b.titre ?? b.theme ?? "Besoin de formation"}</div>
                  <div className="dash-list-meta">
                    {b.username ?? "—"}
                    {prio && <Tag color={PRIORITE_COLOR[prio] ?? "default"} style={{ marginInlineStart: 8 }}>{prio}</Tag>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardPendingNeeds;
