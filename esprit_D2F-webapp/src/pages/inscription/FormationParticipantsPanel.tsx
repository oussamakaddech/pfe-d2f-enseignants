import { useMemo, useState } from "react";
import { Card, Avatar, Tag, Typography, Input, Space } from "antd";
import {
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useInscriptionsByFormation } from "@/hooks/formation";
import { InscriptionStatGrid, PageLoader, EmptyStateStandard } from "@/components/common";
import { brand, neutral } from "@/styles/themes/tokens";
import type { Id } from "@/models/common";

const { Text } = Typography;

type Etat = "APPROVED" | "PENDING" | "REJECTED";

interface EnseignantRef {
  nom?: string;
  prenom?: string;
  mail?: string;
  deptLibelle?: string;
  upLibelle?: string;
}

interface Inscription {
  id: Id;
  etat: Etat;
  dateDemande: string;
  enseignant: EnseignantRef;
}

const ETAT_META: Record<Etat, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  APPROVED: { color: "#15803d", bg: "#dcfce7", label: "Approuvé",   icon: <CheckCircleOutlined /> },
  PENDING:  { color: "#b45309", bg: "#fef3c7", label: "En attente", icon: <ClockCircleOutlined /> },
  REJECTED: { color: "#b51200", bg: "#fee2e2", label: "Rejeté",     icon: <CloseCircleOutlined /> },
};

function normalizeList(data: unknown): Inscription[] {
  if (Array.isArray(data)) return data as Inscription[];
  const obj = data as { content?: unknown } | null;
  if (obj && Array.isArray(obj.content)) return obj.content as Inscription[];
  return [];
}

export default function FormationParticipantsPanel({ formationId }: Readonly<{ formationId: Id }>) {
  const { data, isLoading } = useInscriptionsByFormation(formationId);
  const [search, setSearch] = useState("");

  const list = useMemo(() => normalizeList(data), [data]);

  const stats = useMemo(() => ({
    total:    list.length,
    approved: list.filter((i) => i.etat === "APPROVED").length,
    pending:  list.filter((i) => i.etat === "PENDING").length,
    rejected: list.filter((i) => i.etat === "REJECTED").length,
  }), [list]);

  const displayed = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((i) => {
      const e = i.enseignant ?? {};
      return (
        `${e.prenom ?? ""} ${e.nom ?? ""}`.toLowerCase().includes(term) ||
        (e.mail ?? "").toLowerCase().includes(term) ||
        (e.deptLibelle ?? "").toLowerCase().includes(term) ||
        (e.upLibelle ?? "").toLowerCase().includes(term)
      );
    });
  }, [list, search]);

  return (
    <Card
      className="fiche-card"
      style={{ marginTop: 24 }}
      title={
        <Space>
          <TeamOutlined className="fiche-card-icon" />
          <span className="fiche-card-title-text">Participants &amp; inscriptions</span>
          <Tag color="default" style={{ borderRadius: 10 }}>{stats.total}</Tag>
        </Space>
      }
    >
      {isLoading ? (
        <PageLoader tip="Chargement des participants..." minHeight={200} />
      ) : (
        <>
          {/* Statistiques */}
          <InscriptionStatGrid
            minColumnWidth={150}
            gap={12}
            stats={[
              { icon: <TeamOutlined />,        label: "Total inscrits", value: stats.total,    tone: "brand"   },
              { icon: <CheckCircleOutlined />, label: "Approuvés",      value: stats.approved, tone: "success" },
              { icon: <ClockCircleOutlined />, label: "En attente",     value: stats.pending,  tone: "warning" },
              { icon: <CloseCircleOutlined />, label: "Rejetés",        value: stats.rejected, tone: "danger"  },
            ]}
          />

          {/* Recherche */}
          {list.length > 0 && (
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: neutral[400] }} />}
              placeholder="Rechercher un participant (nom, email, département…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360, marginBottom: 16 }}
            />
          )}

          {/* Liste des participants */}
          {list.length === 0 ? (
            <EmptyStateStandard
              title="Aucun participant inscrit"
              description="Les enseignants apparaîtront ici après avoir soumis une demande d'inscription."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayed.map((i) => {
                const e = i.enseignant ?? {};
                const meta = ETAT_META[i.etat] ?? ETAT_META.PENDING;
                const fullName = `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || "—";
                return (
                  <div
                    key={i.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--border-color, #eef0f3)",
                      background: "var(--bg-card, #fff)",
                    }}
                  >
                    <Avatar style={{ backgroundColor: brand[500], flexShrink: 0 }} icon={<UserOutlined />}>
                      {(e.prenom?.[0] ?? "") + (e.nom?.[0] ?? "")}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: neutral[800] }}>{fullName}</div>
                      <div style={{ fontSize: 12.5, color: neutral[500], display: "flex", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
                        {e.mail && <span><MailOutlined style={{ marginRight: 4 }} />{e.mail}</span>}
                        {e.deptLibelle && <span><ApartmentOutlined style={{ marginRight: 4 }} />{e.deptLibelle}</span>}
                        {e.upLibelle && <span><TeamOutlined style={{ marginRight: 4 }} />{e.upLibelle}</span>}
                      </div>
                    </div>
                    <Tag
                      icon={meta.icon}
                      style={{ color: meta.color, background: meta.bg, border: "none", borderRadius: 16, fontWeight: 600, padding: "2px 10px" }}
                    >
                      {meta.label}
                    </Tag>
                  </div>
                );
              })}
              {displayed.length === 0 && (
                <Text type="secondary" style={{ padding: "8px 4px" }}>Aucun participant ne correspond à la recherche.</Text>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
