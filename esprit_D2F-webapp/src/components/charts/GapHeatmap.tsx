import { memo, useMemo } from "react";
import { Empty, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { GapHeatmapCell } from "@/models/analyse";

interface GapHeatmapProps {
  readonly data: readonly GapHeatmapCell[];
  readonly maxGap?: number; // borne haute de l'échelle (défaut 5 niveaux)
}

/** Échelle de couleur vert → rouge selon l'ampleur du gap moyen (0 → maxGap). */
function gapColor(value: number, maxGap: number): string {
  if (value <= 0) return "transparent";
  const ratio = Math.max(0, Math.min(1, value / maxGap));
  // Interpole sur une palette ambre→rouge avec opacité croissante.
  const alpha = 0.15 + ratio * 0.75;
  const hue = 45 - ratio * 45; // 45 (ambre) → 0 (rouge)
  return `hsla(${hue}, 85%, 50%, ${alpha})`;
}

interface PivotRow {
  key: string;
  departement: string;
  [competence: string]: string | number;
}

/**
 * Heatmap Département × Compétence du gap moyen — révèle les angles morts
 * collectifs de compétence par département (innovation PFE #5).
 */
const GapHeatmap = memo(function GapHeatmap({ data, maxGap = 5 }: GapHeatmapProps) {
  const { rows, competences } = useMemo(() => {
    const compMap = new Map<number, string>();
    const deptMap = new Map<string, PivotRow>();

    for (const cell of data) {
      compMap.set(cell.competence_id, cell.competence_nom);
      const row =
        deptMap.get(cell.departement) ??
        ({ key: cell.departement, departement: cell.departement } as PivotRow);
      row[`c${cell.competence_id}`] = cell.avg_gap;
      deptMap.set(cell.departement, row);
    }

    const comps = [...compMap.entries()].map(([id, nom]) => ({ id, nom }));
    return { rows: [...deptMap.values()], competences: comps };
  }, [data]);

  const columns = useMemo<ColumnsType<PivotRow>>(() => {
    const compCols: ColumnsType<PivotRow> = competences.map((c) => ({
      title: (
        <Tooltip title={c.nom}>
          <span style={{ writingMode: "vertical-rl", whiteSpace: "nowrap" }}>{c.nom}</span>
        </Tooltip>
      ),
      dataIndex: `c${c.id}`,
      key: `c${c.id}`,
      align: "center" as const,
      width: 56,
      onCell: (record: PivotRow) => {
        const v = Number(record[`c${c.id}`] ?? 0);
        return { style: { background: gapColor(v, maxGap), padding: 6 } };
      },
      render: (v?: number) =>
        v == null ? "" : <span style={{ fontWeight: 600 }}>{Number(v).toFixed(1)}</span>,
    }));

    return [
      {
        title: "Département",
        dataIndex: "departement",
        key: "departement",
        fixed: "left" as const,
        width: 160,
        render: (v: string) => <strong>{v || "—"}</strong>,
      },
      ...compCols,
    ];
  }, [competences, maxGap]);

  if (!data.length) {
    return <Empty description="Aucune donnée de gap par département" />;
  }

  return (
    <Table<PivotRow>
      dataSource={rows}
      columns={columns}
      pagination={false}
      size="small"
      bordered
      scroll={{ x: "max-content" }}
    />
  );
});

export default GapHeatmap;
