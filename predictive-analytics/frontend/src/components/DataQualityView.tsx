import { Progress, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { QualityMetric, TeacherDataQualityReport } from "../api/types";
import { formatPercent } from "../lib/format";
import { QualityTag } from "./QualityTag";

const metricColumns: ColumnsType<QualityMetric> = [
  {
    title: "Métrique",
    dataIndex: "name",
    render: (value: string) => <span style={{ fontWeight: 600 }}>{value.replace(/_/g, " ")}</span>,
  },
  {
    title: "Statut",
    dataIndex: "status",
    render: (value: QualityMetric["status"]) => <QualityTag status={value} />,
  },
  {
    title: "Score",
    dataIndex: "score",
    render: (value: number) => (
      <Progress percent={Math.round(value * 100)} size="small" style={{ minWidth: 140 }} />
    ),
  },
  {
    title: "Détail",
    dataIndex: "detail",
    render: (value: string) => <span style={{ fontSize: 12 }}>{value}</span>,
  },
];

interface Props {
  report: TeacherDataQualityReport;
}

export function DataQualityView({ report }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <Progress
          type="dashboard"
          percent={Math.round(report.overall_score * 100)}
          format={() => formatPercent(report.overall_score, 0)}
        />
        <QualityTag status={report.overall_status} />
        {report.missing_competency_ids.length > 0 && (
          <Tag color="orange">
            {report.missing_competency_ids.length} savoir(s) non renseigné(s)
          </Tag>
        )}
        {report.stale_assessment_ids.length > 0 && (
          <Tag color="purple">{report.stale_assessment_ids.length} évaluation(s) obsolète(s)</Tag>
        )}
      </div>
      <Table<QualityMetric>
        size="small"
        rowKey="name"
        columns={metricColumns}
        dataSource={report.metrics}
        pagination={false}
      />
    </div>
  );
}
