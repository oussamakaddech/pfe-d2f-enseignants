import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { HeatmapCell } from "../types";

interface HeatmapProps {
  cells: HeatmapCell[];
  loading?: boolean;
}

function gapColor(avg: number): string {
  // Dégradé vert → rouge selon l'écart moyen (0..1).
  if (avg >= 0.75) return "#f5222d";
  if (avg >= 0.5) return "#fa8c16";
  if (avg >= 0.25) return "#faad14";
  if (avg > 0) return "#a0d911";
  return "#f5f5f5";
}

/** Heatmap des gaps (département × compétence). */
export default function Heatmap({ cells, loading }: HeatmapProps) {
  // Pivoter en colonnes compétence par département.
  const competences = Array.from(new Set(cells.map((c) => c.competence_nom))).sort();
  const departements = Array.from(new Set(cells.map((c) => c.departement))).sort();

  const map = new Map<string, HeatmapCell>();
  cells.forEach((c) => map.set(`${c.departement}|${c.competence_nom}`, c));

  const columns: ColumnsType<{ departement: string }> = [
    { title: "Département", dataIndex: "departement", fixed: "left" },
    ...competences.map((comp) => ({
      title: comp,
      dataIndex: comp,
      render: (_: unknown, row: { departement: string }) => {
        const cell = map.get(`${row.departement}|${comp}`);
        if (!cell) return <span style={{ color: "#bfbfbf" }}>·</span>;
        return (
          <Tag color={gapColor(cell.avg_gap)} style={{ fontWeight: 600 }}>
            {Math.round(cell.avg_gap * 100)}%
          </Tag>
        );
      },
    })),
  ];

  const data = departements.map((d) => ({ departement: d }));

  return (
    <Table
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={false}
      scroll={{ x: "max-content" }}
      size="small"
    />
  );
}
