import { Empty, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SEVERITY_COLOR, severityLabel, sortBySeverity } from "../lib/format";
import type { GapDiagnostic } from "../api/types";

const columns: ColumnsType<GapDiagnostic> = [
  {
    title: "Savoir",
    dataIndex: "knowledge_code",
    render: (_: string, row) => (
      <span>
        <strong>{row.knowledge_code}</strong> — {row.knowledge_name}
      </span>
    ),
  },
  {
    title: "Domaine",
    dataIndex: "domain_id",
    width: 130,
  },
  {
    title: "Type",
    dataIndex: "gap_type",
    width: 170,
    render: (value: string) => <Tag>{value.replace(/_/g, " ")}</Tag>,
  },
  {
    title: "Niveau",
    key: "levels",
    width: 220,
    render: (_: unknown, row) => (
      <span>
        {row.current_level ?? "?"} → {row.required_level ?? "?"}
      </span>
    ),
  },
  {
    title: "Écart",
    dataIndex: "gap_level",
    width: 120,
    render: (value: number) => <strong>+{value}</strong>,
  },
  {
    title: "Sévérité",
    dataIndex: "severity",
    width: 120,
    render: (value: GapDiagnostic["severity"]) => (
      <Tag color={SEVERITY_COLOR[value]}>{severityLabel(value)}</Tag>
    ),
  },
  {
    title: "Explication",
    dataIndex: "explainability",
    width: 220,
    render: (value: GapDiagnostic["explainability"]) => (
      <Tooltip
        title={value ? `${value.rule_label}\n${value.formula}` : undefined}
        overlayStyle={{ maxWidth: 360, whiteSpace: "pre-line" }}
      >
        <span>{value ? value.rule_label : "—"}</span>
      </Tooltip>
    ),
  },
];

interface Props {
  gaps: GapDiagnostic[];
}

export function GapTable({ gaps }: Props) {
  const sorted = sortBySeverity(gaps);
  return (
    <Table<GapDiagnostic>
      size="small"
      rowKey={(row) => `${row.knowledge_id}:${row.gap_type}`}
      columns={columns}
      dataSource={sorted}
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      locale={{
        emptyText: <Empty description="Aucun gap détecté — profil complet" />,
      }}
    />
  );
}

export function severityCounts(gaps: GapDiagnostic[]): Record<string, number> {
  const counts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const gap of gaps) counts[gap.severity] = (counts[gap.severity] ?? 0) + 1;
  return counts;
}
