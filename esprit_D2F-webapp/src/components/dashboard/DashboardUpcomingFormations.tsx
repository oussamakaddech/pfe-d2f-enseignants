import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton, Tag, Button } from "antd";
import { CalendarOutlined, RightOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { InfoCard, EmptyState } from "@/components/ui";
import { useAllFormations } from "@/hooks/formation/useFormations";
import type { Formation } from "@/models/formation";

const UPCOMING_STATES = new Set(["PLANIFIE", "PLANIFIEE", "ENREGISTRE", "VISIBLE"]);

const DashboardUpcomingFormations = memo(function DashboardUpcomingFormations() {
  const navigate = useNavigate();
  const { data, isLoading } = useAllFormations();

  const upcoming = useMemo<Formation[]>(() => {
    const today = dayjs().startOf("day");
    return (data ?? [])
      .filter((f) => f.dateDebut && dayjs(f.dateDebut).isAfter(today.subtract(1, "day")))
      .filter((f) => !f.etatFormation || UPCOMING_STATES.has(f.etatFormation.toUpperCase()))
      .sort((a, b) => dayjs(a.dateDebut).valueOf() - dayjs(b.dateDebut).valueOf())
      .slice(0, 5);
  }, [data]);

  return (
    <InfoCard
      title="Prochaines formations"
      icon={<CalendarOutlined />}
      footer={<Button type="link" style={{ paddingInline: 0 }} onClick={() => navigate("/home/Formation")}>Gérer les formations <RightOutlined /></Button>}
    >
      {(() => {
        if (isLoading) return (
        <Skeleton active paragraph={{ rows: 4 }} />
        );
        if (upcoming.length === 0) return (
        <EmptyState icon={<CalendarOutlined style={{ fontSize: 32 }} />} title="Aucune formation à venir" compact />
        );
        return (
        <div className="dash-list">
          {upcoming.map((f) => (
            <button key={String(f.idFormation)} type="button" className="dash-list-row" onClick={() => navigate(`/home/ListeFormation/${f.idFormation}`)}>
              <div className="dash-list-date">
                <b>{dayjs(f.dateDebut).format("DD")}</b>
                <span>{dayjs(f.dateDebut).format("MMM")}</span>
              </div>
              <div className="dash-list-main">
                <div className="dash-list-title">{f.titreFormation ?? "Formation"}</div>
                <div className="dash-list-meta">
                  <ClockCircleOutlined /> {f.chargeHoraireGlobal ?? 0}h
                  {f.etatFormation && <Tag style={{ marginInlineStart: 8 }}>{f.etatFormation}</Tag>}
                </div>
              </div>
            </button>
          ))}
        </div>
        );
      })()}
    </InfoCard>
  );
});

export default DashboardUpcomingFormations;
