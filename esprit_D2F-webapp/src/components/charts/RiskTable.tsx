import { Table, Avatar, Tag, Space, Progress, Typography, Badge, Button, Tooltip } from "antd";
import { UserOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { TeacherRiskIndicator } from "@/models/analyse";

const { Text } = Typography;

function riskColor(s: number): string {
  if (s >= 0.7) return "#ef4444";
  if (s >= 0.4) return "#f59e0b";
  return "#10b981";
}

function badgeColor(v: number): string {
  if (v > 3) return "#10b981";
  if (v > 0) return "#f59e0b";
  return "#ef4444";
}

function tagColor(v: string): string {
  if (v === "OK") return "green";
  if (v?.includes("entretien")) return "red";
  return "orange";
}

interface Props {
  data: TeacherRiskIndicator[];
  threshold: number;
  onAnalyze?: (teacherId: string) => void;
}

export default function RiskTable({ data, threshold, onAnalyze }: Readonly<Props>) {
  const columns = [
    {
      title: "Enseignant",
      key: "name",
      render: (_: unknown, r: TeacherRiskIndicator) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: riskColor(r.attrition_risk_score) }} />
          <div>
            <Text strong>{r.teacher_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>{r.teacher_id}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Score Risque",
      dataIndex: "attrition_risk_score",
      width: 160,
      sorter: (a: TeacherRiskIndicator, b: TeacherRiskIndicator) => a.attrition_risk_score - b.attrition_risk_score,
      defaultSortOrder: "descend" as const,
      render: (v: number) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={Math.round(v * 100)} size="small" strokeColor={riskColor(v)} showInfo={false} />
          <Text strong style={{ color: riskColor(v) }}>{(v * 100).toFixed(0)}%</Text>
        </Space>
      ),
    },
    {
      title: "Signaux",
      dataIndex: "disengagement_signals",
      render: (signals: string[]) => (
        <Space wrap size={4}>
          {(signals || []).map((s) => (
            <Tag key={s} color="volcano" style={{ fontSize: 11 }}>{s}</Tag>
          ))}
          {(!signals || signals.length === 0) && <Tag color="green">Aucun signal</Tag>}
        </Space>
      ),
    },
    {
      title: "Stagnation",
      dataIndex: "competency_stagnation_rate",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <Text style={{ color: v > 0.5 ? "#ef4444" : "#64748b" }}>{(v * 100).toFixed(0)}%</Text>
      ),
    },
    {
      title: "Formations",
      dataIndex: "training_velocity",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <Badge
          count={v || 0}
          showZero
          style={{ backgroundColor: badgeColor(v) }}
        />
      ),
    },
    {
      title: "Action",
      dataIndex: "recommendation",
      width: 160,
      render: (v: string) => (
        <Tag color={tagColor(v)}>{v}</Tag>
      ),
    },
    ...(onAnalyze
      ? [{
          title: "",
          key: "analyze",
          width: 56,
          render: (_: unknown, r: TeacherRiskIndicator) => (
            <Tooltip title="Lancer l'analyse individuelle">
              <Button
                size="small"
                type="text"
                icon={<ThunderboltOutlined />}
                onClick={() => onAnalyze(r.teacher_id)}
              />
            </Tooltip>
          ),
        }]
      : []),
  ];

  return (
    <Table<TeacherRiskIndicator>
      dataSource={data}
      columns={columns}
      rowKey="teacher_id"
      pagination={{ pageSize: 8 }}
      size="middle"
      rowClassName={(r) => (r.attrition_risk_score >= threshold ? "risk-row-high" : "")}
    />
  );
}
