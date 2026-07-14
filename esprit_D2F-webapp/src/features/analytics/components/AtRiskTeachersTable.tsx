import { Table, Tag, Progress, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { riskColor, riskLabel, formatDepartment, formatUP } from "../utils/format";
import type { AtRiskTeacher } from "../types";

interface AtRiskTeachersTableProps {
  teachers: AtRiskTeacher[];
  loading?: boolean;
  onSelect?: (id: string) => void;
}

/** Table des enseignants à risque (dashboard décisionnel). */
export default function AtRiskTeachersTable({
  teachers,
  loading,
  onSelect,
}: AtRiskTeachersTableProps) {
  const columns: ColumnsType<AtRiskTeacher> = [
    { title: "Enseignant", dataIndex: "nom", render: (v) => <a>{v}</a> },
    { title: "Département", dataIndex: "departement", render: (v) => formatDepartment(v) },
    { title: "UP", dataIndex: "up", render: (v) => formatUP(v) },
    {
      title: "Score de risque",
      dataIndex: "score_risque",
      render: (v: number) => (
        <Progress percent={Math.round(v * 100)} size="small" strokeColor={riskColor(riskLabelToLevel(v))} />
      ),
      sorter: (a, b) => a.score_risque - b.score_risque,
      defaultSortOrder: "descend",
    },
    {
      title: "Niveau",
      dataIndex: "niveau_risque",
      render: (v: AtRiskTeacher["niveau_risque"]) => <Tag color={riskColor(v)}>{riskLabel(v)}</Tag>,
    },
    { title: "Gaps critiques", dataIndex: "nb_gaps_critiques", sorter: (a, b) => a.nb_gaps_critiques - b.nb_gaps_critiques },
    { title: "Tendance", dataIndex: "tendance" },
  ];

  if (!loading && teachers.length === 0) return <Empty description="Aucun enseignant à risque" />;

  return (
    <Table<AtRiskTeacher>
      rowKey="enseignant_id"
      loading={loading}
      columns={columns}
      dataSource={teachers}
      pagination={{ pageSize: 10 }}
      onRow={(r) => ({ onClick: () => onSelect?.(r.enseignant_id), style: { cursor: onSelect ? "pointer" : "default" } })}
    />
  );
}

function riskLabelToLevel(score: number): AtRiskTeacher["niveau_risque"] {
  if (score >= 0.75) return "CRITIQUE";
  if (score >= 0.5) return "ELEVE";
  if (score >= 0.25) return "MODERE";
  return "FAIBLE";
}
