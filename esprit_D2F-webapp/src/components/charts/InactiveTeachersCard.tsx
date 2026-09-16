import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Empty, Skeleton, Tag, Button } from "antd";
import { RightOutlined, CoffeeOutlined } from "@ant-design/icons";
import { useEnseignantsInactifs } from "@/hooks/analyse/useReporting";
import type { EnseignantInactif, NiveauRisque } from "@/models/analyse";

const RISK_TAG: Record<NiveauRisque, { color: string; label: string }> = {
  CRITIQUE: { color: "red", label: "> 12 mois" },
  ELEVE: { color: "orange", label: "6-12 mois" },
  MODERE: { color: "gold", label: "3-6 mois" },
  FAIBLE: { color: "green", label: "< 3 mois" },
};

function initials(t: EnseignantInactif): string {
  return `${t.nom?.[0] ?? ""}${t.prenom?.[0] ?? ""}`.toUpperCase() || "?";
}

interface InactiveTeachersCardProps {
  readonly mois?: number;
  readonly limit?: number;
}

/** Aperçu des enseignants sans formation depuis longtemps (réutilise useReporting). */
const InactiveTeachersCard = memo(function InactiveTeachersCard({ mois = 6, limit = 5 }: InactiveTeachersCardProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useEnseignantsInactifs({ mois, page: 0, size: limit });

  if (isLoading && !data) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  if (items.length === 0) {
    return (
      <Empty
        image={<CoffeeOutlined style={{ fontSize: 40, color: "var(--color-success)" }} />}
        description={`Aucun enseignant sans formation depuis plus de ${mois} mois`}
      />
    );
  }

  return (
    <div>
      {items.map((t) => {
        const tag = RISK_TAG[t.niveauRisque];
        return (
          <button
            key={t.enseignantId}
            type="button"
            className="analyse-inactive-row"
            style={{ width: "100%", cursor: "pointer", textAlign: "left", background: "var(--bg-card)" }}
            onClick={() => navigate(`/home/analytics/teacher/${t.enseignantId}`)}
          >
            <div className="analyse-inactive-avatar">{initials(t)}</div>
            <div className="analyse-inactive-main">
              <div className="analyse-inactive-name">{t.nom} {t.prenom}</div>
              <div className="analyse-inactive-meta">
                {t.departement ?? "—"} · <Tag color={tag.color} style={{ marginInlineEnd: 0 }}>{tag.label}</Tag>
              </div>
            </div>
            <div className="analyse-inactive-months">
              <b>{t.nombreMoisDepuisDerniereFormation ?? "∞"}</b>
              <span>mois</span>
            </div>
          </button>
        );
      })}
      <Button
        type="link"
        style={{ paddingInline: 0, marginTop: 8 }}
        onClick={() => navigate("/home/analytics/enseignants-inactifs")}
      >
        Voir les {total} enseignant{total > 1 ? "s" : ""} inactif{total > 1 ? "s" : ""} <RightOutlined />
      </Button>
    </div>
  );
});

export default InactiveTeachersCard;
