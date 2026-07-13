import { memo, useMemo, useState, useCallback } from "react";
import { Empty, Table, Tooltip, Drawer, Tag, Typography, Space, Spin, Button } from "antd";
import {
  EyeOutlined, CloseOutlined, ArrowDownOutlined, UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import RiskBadge from "./RiskBadge";
import type { GapHeatmapCell, HeatmapDrilldownTeacher } from "@/models/analyse";
import { useHeatmapDrilldown } from "@/hooks/analyse/useAnalysePredictive";
import type { NiveauUrgence, NiveauRisque } from "@/models/analyse/analytics";

const { Text } = Typography;

interface GapHeatmapProps {
  readonly data: readonly GapHeatmapCell[];
  readonly maxGap?: number;
  readonly onAnalyzeTeacher?: (teacherId: string) => void;
}

/** Échelle de couleur vert → rouge selon l'ampleur du gap moyen (0 → maxGap). */
function gapColor(value: number, maxGap: number): string {
  if (value <= 0) return "transparent";
  const ratio = Math.max(0, Math.min(1, value / maxGap));
  const alpha = 0.15 + ratio * 0.75;
  const hue = 45 - ratio * 45;
  return `hsla(${hue}, 85%, 50%, ${alpha})`;
}

interface PivotRow {
  key: string;
  departement: string;
  [competence: string]: string | number;
}

interface DrilldownComp {
  id: number;
  nom: string;
}

/**
 * Heatmap Département × Compétence du gap moyen avec drilldown au clic sur cellule.
 * Révèle les angles morts collectifs de compétence par département et permet
 * d'explorer la liste détaillée des enseignants par cellule.
 */
const GapHeatmap = memo(function GapHeatmap({ data, maxGap = 5, onAnalyzeTeacher }: GapHeatmapProps) {
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

  // ── Drilldown state ──
  const [drilldown, setDrilldown] = useState<{
    departement: string;
    competence: DrilldownComp;
  } | null>(null);
  const {
    data: drilldownData,
    isLoading: drilldownLoading,
  } = useHeatmapDrilldown(
    drilldown?.departement ?? null,
    drilldown?.competence.id ?? null,
  );

  const handleCellClick = useCallback((dept: string, compId: number, compNom: string) => {
    setDrilldown({ departement: dept, competence: { id: compId, nom: compNom } });
  }, []);

  const closeDrilldown = useCallback(() => {
    setDrilldown(null);
  }, []);

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
        return {
          style: {
            background: gapColor(v, maxGap),
            padding: 6,
            cursor: v > 0 ? "pointer" : "default",
          },
          onClick: () => {
            if (v > 0) handleCellClick(record.departement, c.id, c.nom);
          },
        };
      },
      render: (v?: number) =>
        v == null ? "" : (
          <Tooltip title={`${Number(v).toFixed(2)} — cliquer pour le détail`}>
            <span style={{ fontWeight: 600 }}>{Number(v).toFixed(1)}</span>
          </Tooltip>
        ),
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
  }, [competences, maxGap, handleCellClick]);

  // ── Drilldown table columns ──
  const drilldownColumns = useMemo<ColumnsType<HeatmapDrilldownTeacher>>(() => [
    {
      title: "Enseignant",
      dataIndex: "enseignant_id",
      key: "enseignant_id",
      width: 120,
      render: (v: string) => (
        <Space size={4}>
          <UserOutlined />
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: "Niveau Actuel",
      dataIndex: "niveau_actuel",
      key: "niveau_actuel",
      width: 100,
      align: "center" as const,
      render: (v: number) => {
        let tagColor: string;
        if (v >= 3) {
          tagColor = "green";
        } else if (v >= 2) {
          tagColor = "blue";
        } else {
          tagColor = "default";
        }
        return (
          <Tag color={tagColor}>
            {v}/5
          </Tag>
        );
      },
    },
    {
      title: "Niveau Requis",
      dataIndex: "niveau_requis",
      key: "niveau_requis",
      width: 100,
      align: "center" as const,
      render: (v: number) => <Tag>{v}/5</Tag>,
    },
    {
      title: "Gap Score",
      dataIndex: "gap_score",
      key: "gap_score",
      width: 100,
      align: "center" as const,
      sorter: (a, b) => a.gap_score - b.gap_score,
      defaultSortOrder: "descend" as const,
      render: (v: number) => {
        const pct = Math.round(v * 100);
        let color: string;
        if (pct >= 75) {
          color = "#ef4444";
        } else if (pct >= 50) {
          color = "#f97316";
        } else if (pct >= 25) {
          color = "#f59e0b";
        } else {
          color = "#10b981";
        }
        return <Text strong style={{ color }}>{pct}%</Text>;
      },
    },
    {
      title: "Urgence",
      dataIndex: "niveau_urgence",
      key: "niveau_urgence",
      width: 100,
      align: "center" as const,
      render: (v: string) => <RiskBadge type="urgence" value={v as NiveauUrgence} />,
    },
    {
      title: "Stagnation",
      dataIndex: "mois_stagnation",
      key: "mois_stagnation",
      width: 100,
      align: "center" as const,
      render: (v: number) => {
        let tagColor: string;
        if (v >= 12) {
          tagColor = "red";
        } else if (v >= 6) {
          tagColor = "orange";
        } else {
          tagColor = "default";
        }
        return (
          <Tag color={tagColor}>
            {v} mois
          </Tag>
        );
      },
    },
    {
      title: "Risque Global",
      dataIndex: "niveau_risque",
      key: "niveau_risque",
      width: 100,
      align: "center" as const,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">—</Text>;
        return <RiskBadge type="risque" value={v as NiveauRisque} />;
      },
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_, record) => onAnalyzeTeacher ? (
        <Tooltip title="Analyser cet enseignant">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onAnalyzeTeacher(record.enseignant_id)}
          />
        </Tooltip>
      ) : null,
    },
  ], [onAnalyzeTeacher]);

  if (!data.length) {
    return <Empty description="Aucune donnée de gap par département" />;
  }

  return (
    <>
      <Table<PivotRow>
        dataSource={rows}
        columns={columns}
        pagination={false}
        size="small"
        bordered
        scroll={{ x: "max-content" }}
      />

      <Drawer
        title={
          <Space>
            <ArrowDownOutlined style={{ color: "#b51200" }} />
            <span>
              Drilldown — {drilldown?.departement} / {drilldown?.competence.nom}
            </span>
          </Space>
        }
        placement="right"
        width={720}
        open={!!drilldown}
        onClose={closeDrilldown}
        extra={
          <Button icon={<CloseOutlined />} onClick={closeDrilldown}>
            Fermer
          </Button>
        }
      >
        <Spin spinning={drilldownLoading}>
          {drilldownData ? (
            <>
              <Space style={{ marginBottom: 16 }} size={16}>
                <Tag color="blue">{drilldownData.nb_enseignants} enseignant(s)</Tag>
                <Tag color="orange">Gap moyen: {(drilldownData.avg_gap * 100).toFixed(1)}%</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cliquez sur 👁 pour lancer une analyse individuelle
                </Text>
              </Space>

              <Table<HeatmapDrilldownTeacher>
                dataSource={drilldownData.enseignants}
                columns={drilldownColumns}
                rowKey="enseignant_id"
                size="small"
                pagination={{ pageSize: 10, showTotal: (t) => `${t} enseignant(s)` }}
                scroll={{ x: 680 }}
              />
            </>
          ) : (
            <Empty description="Chargement..." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      </Drawer>
    </>
  );
});

export default GapHeatmap;
