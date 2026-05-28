import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, Empty, Skeleton, Tabs } from "antd";
import {
  ArrowLeftOutlined, CheckCircleOutlined, CommentOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useFormationById } from "@/hooks/formation";
import { useAggregatedPresences } from "@/hooks/presence";
import SeanceCard, { type SeanceCardData } from "./SeanceCard";
import FormationEvaluationsTab from "./FormationEvaluationsTab";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { FormationHeaderCard } from "./components/FormationHeaderCard";
import { EnseignantsTab } from "./components/EnseignantsTab";
import "@/styles/pages/formation-detail.css";

const matchesParticipant = (
  x: { enseignant?: { mail?: string; id?: unknown } },
  ens: { mail?: string; id?: unknown }
) =>
  (x.enseignant?.mail && x.enseignant.mail === ens.mail) ||
  (x.enseignant?.id && x.enseignant.id === ens.id);

const FormationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message: msgApi } = useAppNotification();

  const { data: formation = null, isLoading: loading, isError } = useFormationById(id);
  useEffect(() => {
    if (isError) msgApi.error("Erreur lors du chargement de la formation");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const seanceIds = useMemo(
    () => (formation?.seances || []).map((s) => s.idSeance).filter(Boolean) as number[],
    [formation],
  );
  const { data: aggResults = [], isLoading: aggLoading, refetch: refetchPresences } =
    useAggregatedPresences(seanceIds);

  const presencesBySeance = useMemo(() => {
    const byId: Record<string, { presence: boolean; enseignant?: { mail?: string; id?: unknown } }[]> = {};
    seanceIds.forEach((sid: number, idx) => {
      byId[sid] = ((aggResults[idx] as { present?: boolean; presence?: boolean }[]) || []).map((p) => ({
        ...p,
        presence: typeof p.present === "boolean" ? p.present : !!p.presence,
      }));
    });
    return byId;
  }, [seanceIds, aggResults]);

  const seancesCount = formation?.seances?.length || 0;

  const allParticipants = useMemo(() => {
    if (!formation?.seances) return [];
    const map = new Map<string, { mail?: string; id?: unknown; seancesInscrites: number } & Record<string, unknown>>();
    formation.seances.forEach((s) => {
      (s.participants || []).forEach((p) => {
        const key = (p.mail || p.id) as string;
        if (!key) return;
        if (!map.has(key)) map.set(key, { ...p, seancesInscrites: 0 });
        map.get(key)!.seancesInscrites = (map.get(key)!.seancesInscrites as number) + 1;
      });
    });
    return Array.from(map.values());
  }, [formation]);

  const participantsWithStats = useMemo(() =>
    allParticipants.map((ens) => {
      let presentes = 0, totalSeancesAvecPresence = 0;
      Object.values(presencesBySeance).forEach((presences) => {
        const p = presences.find((x) => matchesParticipant(x, ens));
        if (p) { totalSeancesAvecPresence += 1; if (p.presence) presentes += 1; }
      });
      const taux = totalSeancesAvecPresence === 0 ? 0 : Math.round((presentes * 100) / totalSeancesAvecPresence);
      return { ...ens, presentes, totalSeancesAvecPresence, taux } as Parameters<typeof EnseignantsTab>[0]["participantsWithStats"][number];
    }),
    [allParticipants, presencesBySeance]
  );

  const globalStats = useMemo(() => {
    let total = 0, presents = 0;
    Object.values(presencesBySeance).forEach((presences) => {
      presences.forEach((p) => { total += 1; if (p.presence) presents += 1; });
    });
    return { taux: total === 0 ? 0 : Math.round((presents * 100) / total) };
  }, [presencesBySeance]);

  if (loading || !formation) {
    return (
      <div className="fd-container">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 8 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  const tabItems = [
    {
      key: "presences",
      label: <span><CheckCircleOutlined style={{ marginRight: 6 }} />Présences par séance</span>,
      children: (
        <div style={{ paddingTop: 8 }}>
          {formation.seances && formation.seances.length > 0
            ? formation.seances.map((s) => <SeanceCard key={String(s.idSeance)} seance={s as SeanceCardData} />)
            : <Empty description="Aucune séance pour cette formation" />}
        </div>
      ),
    },
    {
      key: "enseignants",
      label: <span><TeamOutlined style={{ marginRight: 6 }} />Enseignants ({allParticipants.length})</span>,
      children: (
        <EnseignantsTab
          participantsWithStats={participantsWithStats}
          seancesCount={seancesCount}
          aggLoading={aggLoading}
          onRefetch={() => void refetchPresences()}
        />
      ),
    },
    {
      key: "evaluations",
      label: <span><CommentOutlined style={{ marginRight: 6 }} />Évaluations</span>,
      children: <FormationEvaluationsTab formationId={id ?? ""} />,
    },
  ];

  return (
    <div className="fd-container">
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/home/animateur-formations")} className="fd-back-btn">
        Retour aux formations
      </Button>
      <FormationHeaderCard
        formation={formation}
        seancesCount={seancesCount}
        participantsCount={allParticipants.length}
        globalTaux={globalStats.taux}
      />
      <Card className="fd-tabs-card" variant="borderless">
        <Tabs items={tabItems} className="fd-tabs" />
      </Card>
    </div>
  );
};

export default FormationDetail;
