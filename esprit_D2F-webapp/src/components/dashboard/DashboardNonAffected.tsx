import { memo, useMemo } from "react";
import { Skeleton, Tag } from "antd";
import { TeamOutlined, ApartmentOutlined } from "@ant-design/icons";
import { InfoCard, EmptyState } from "@/components/ui";
import { useEnseignantsNonAffectes } from "@/hooks/kpi";
import type { DashboardScope } from "@/models/dashboard";

interface NonAffecte {
  nom?: string;
  prenom?: string;
  mail?: string;
  deptLibelle?: string;
  upLibelle?: string;
}

function initials(nom?: string, prenom?: string) {
  return `${(nom ?? "").charAt(0)}${(prenom ?? "").charAt(0)}`.toUpperCase() || "?";
}

interface Props { readonly scope: DashboardScope; }

const DashboardNonAffected = memo(function DashboardNonAffected({ scope }: Props) {
  const { data: raw, isLoading } = useEnseignantsNonAffectes(scope.start, scope.end);

  const list = useMemo(
    () => (Array.isArray(raw) ? (raw as NonAffecte[]) : []).slice(0, 12),
    [raw],
  );

  const total = Array.isArray(raw) ? raw.length : 0;

  return (
    <InfoCard
      title="Enseignants non affectés"
      icon={<TeamOutlined />}
      badge={total > 0 ? <Tag color="warning">{total}</Tag> : undefined}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<TeamOutlined style={{ fontSize: 28 }} />}
          title="Tous les enseignants sont affectés"
          description="Aucun enseignant sans formation sur la période."
          compact
        />
      ) : (
        <div className="dash-list">
          {list.map((item, idx) => (
            <div key={`${item.mail ?? ""}-${idx}`} className="dash-list-row dash-list-row-static">
              {/* Avatar initiales */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg,#b51200,#9a0f00)",
                color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.02em",
              }}>
                {initials(item.nom, item.prenom)}
              </div>
              <div className="dash-list-main">
                <div className="dash-list-title">{item.nom} {item.prenom}</div>
                <div className="dash-list-meta">
                  {item.deptLibelle && (
                    <span style={{ marginRight: 10 }}>
                      <ApartmentOutlined style={{ marginRight: 3 }} />
                      {item.deptLibelle}
                    </span>
                  )}
                  {item.upLibelle && <span>{item.upLibelle}</span>}
                </div>
              </div>
              <Tag color="orange" style={{ flexShrink: 0 }}>Non affecté</Tag>
            </div>
          ))}
          {total > 12 && (
            <div style={{ textAlign: "center", paddingTop: 8, fontSize: 12, color: "var(--neutral-500)" }}>
              + {total - 12} autres enseignants
            </div>
          )}
        </div>
      )}
    </InfoCard>
  );
});

export default DashboardNonAffected;
