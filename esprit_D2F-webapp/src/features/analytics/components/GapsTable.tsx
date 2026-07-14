import { Table, Tag, Progress, Space, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { URGENCE_COLORS } from "../constants";
import { gapSeverityColor } from "../utils/format";
import type { SkillGap } from "../types";

interface GapsTableProps {
  gaps: SkillGap[];
  loading?: boolean;
  onRowClick?: (gap: SkillGap) => void;
}

/** Table des gaps de compétence avec filtres, tri et badges de sévérité. */
export default function GapsTable({ gaps, loading, onRowClick }: GapsTableProps) {
  const columns: ColumnsType<SkillGap> = [
    {
      title: "Compétence",
      dataIndex: "competence_nom",
      sorter: (a, b) => a.competence_nom.localeCompare(b.competence_nom),
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{r.competence_nom}</span>
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>{r.competence_code}</span>
        </Space>
      ),
    },
    {
      title: "Domaine",
      dataIndex: "domaine_nom",
      render: (v) => v ?? "—",
    },
    {
      title: "Niveau actuel → requis",
      render: (_, r) => (
        <Tag>
          N{r.niveau_actuel} → N{r.niveau_requis}
        </Tag>
      ),
      sorter: (a, b) => a.niveau_requis - a.niveau_actuel,
    },
    {
      title: "Écart",
      dataIndex: "gap_score",
      render: (v: number) => (
        <Progress percent={Math.round(v * 100)} size="small" strokeColor={gapSeverityColor(v)} />
      ),
      sorter: (a, b) => a.gap_score - b.gap_score,
      defaultSortOrder: "descend",
    },
    {
      title: "Urgence",
      dataIndex: "niveau_urgence",
      render: (v: SkillGap["niveau_urgence"]) => (
        <Tag color={URGENCE_COLORS[v] as string}>{v}</Tag>
      ),
      filters: ["FAIBLE", "MODEREE", "HAUTE", "CRITIQUE"].map((u) => ({ text: u, value: u })),
      onFilter: (value, r) => r.niveau_urgence === value,
    },
    {
      title: "Stagnation",
      dataIndex: "mois_stagnation",
      render: (v: number) => (v > 0 ? `${v} mois` : "—"),
      sorter: (a, b) => a.mois_stagnation - b.mois_stagnation,
    },
    {
      title: "Régression",
      dataIndex: "en_regression",
      render: (v: boolean) => (v ? <Tag color="red">Oui</Tag> : <Tag>Non</Tag>),
    },
  ];

  if (!loading && gaps.length === 0) {
    return <Empty description="Aucun gap détecté" />;
  }

  return (
    <Table<SkillGap>
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={gaps}
      pagination={{ pageSize: 10 }}
      onRow={(r) => ({ onClick: () => onRowClick?.(r), style: { cursor: onRowClick ? "pointer" : "default" } })}
      size="middle"
    />
  );
}
