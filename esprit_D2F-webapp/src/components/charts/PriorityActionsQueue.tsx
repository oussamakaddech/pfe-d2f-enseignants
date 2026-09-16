import { useMemo } from "react";
import {
  Card, Table, Tag, Space, Empty, Spin, Select, Button, Typography, Progress, Tooltip,
} from "antd";
import {
  ThunderboltOutlined, UserOutlined, FireOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { PriorityAction } from "@/models/analyse";

const { Text } = Typography;
const { Option } = Select;

interface PriorityActionsQueueProps {
  readonly data: PriorityAction[] | undefined;
  readonly loading: boolean;
  readonly departements: string[];
  readonly deptFilter: string;
  readonly onDeptChange: (dept: string) => void;
  readonly onAnalyzeTeacher: (teacherId: string) => void;
}

const RISQUE_COLOR: Record<string, string> = {
  CRITIQUE: "#ef4444",
  ELEVE: "#f97316",
  MODERE: "#f59e0b",
  FAIBLE: "#10b981",
};

const TENDANCE_TAG: Record<string, { color: string; label: string }> = {
  en_hausse: { color: "red", label: "↑ Hausse" },
  stable: { color: "blue", label: "→ Stable" },
  en_baisse: { color: "green", label: "↓ Baisse" },
};

function scoreToColor(score: number): string {
  if (score >= 0.8) return "#ef4444";
  if (score >= 0.6) return "#f97316";
  if (score >= 0.4) return "#f59e0b";
  return "#10b981";
}

export default function PriorityActionsQueue({
  data, loading, departements, deptFilter, onDeptChange, onAnalyzeTeacher,
}: PriorityActionsQueueProps) {
  const columns: ColumnsType<PriorityAction> = useMemo(() => [
    {
      title: "#",
      key: "rank",
      width: 50,
      render: (_, __, index) => (
        <Text strong style={{ color: index < 3 ? "#b51200" : undefined }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: "Score Action",
      dataIndex: "score_action",
      width: 140,
      sorter: (a, b) => a.score_action - b.score_action,
      defaultSortOrder: "descend",
      render: (v: number) => (
        <Tooltip title={`Score composite: ${(v * 100).toFixed(1)}%`}>
          <Progress
            percent={Math.round(v * 100)}
            strokeColor={scoreToColor(v)}
            size="small"
            format={(p) => `${p}%`}
          />
        </Tooltip>
      ),
    },
    {
      title: "Niveau Risque",
      dataIndex: "niveau_risque",
      width: 110,
      filters: [
        { text: "CRITIQUE", value: "CRITIQUE" },
        { text: "ELEVE", value: "ELEVE" },
        { text: "MODERE", value: "MODERE" },
        { text: "FAIBLE", value: "FAIBLE" },
      ],
      onFilter: (value, record) => record.niveau_risque === value,
      render: (v: string | null) => {
        if (!v) return <Tag>—</Tag>;
        const tendance = TENDANCE_TAG[v] || { color: "default", label: v };
        return (
          <Tag color={RISQUE_COLOR[v] || "default"} style={{ fontWeight: 600 }}>
            {tendance.label}
          </Tag>
        );
      },
    },
    {
      title: "Tendance",
      dataIndex: "tendance",
      width: 100,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">—</Text>;
        const t = TENDANCE_TAG[v] || { color: "default", label: v };
        return <Tag color={t.color} icon={v === "en_hausse" ? <FireOutlined /> : undefined}>{t.label}</Tag>;
      },
    },
    {
      title: "Gaps Critiques",
      dataIndex: "nb_gaps_critiques",
      width: 90,
      align: "center" as const,
      sorter: (a, b) => a.nb_gaps_critiques - b.nb_gaps_critiques,
      render: (v: number) => {
        let tagColor: string;
        if (v > 3) {
          tagColor = "red";
        } else if (v > 0) {
          tagColor = "orange";
        } else {
          tagColor = "default";
        }
        return (
          <Tag color={tagColor}>
            {v}
          </Tag>
        );
      },
    },
    {
      title: "Alertes Ouvertes",
      dataIndex: "nb_alertes_ouvertes",
      width: 90,
      align: "center" as const,
      render: (v: number) => {
        let tagColor: string;
        if (v > 3) {
          tagColor = "red";
        } else if (v > 0) {
          tagColor = "orange";
        } else {
          tagColor = "green";
        }
        return (
          <Tag color={tagColor}>
            {v}
          </Tag>
        );
      },
    },
    {
      title: "Compétence Prioritaire",
      key: "competence_prioritaire",
      width: 200,
      render: (_, record) => {
        const comp = record.competence_prioritaire;
        if (!comp) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{comp.competence_nom}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Niveau: {comp.niveau_actuel} → {comp.niveau_requis}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Formation Recommandée",
      key: "meilleure_formation",
      width: 220,
      render: (_, record) => {
        const f = record.meilleure_formation;
        if (!f) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={2}>
            <Text>{f.formation_titre}</Text>
            <Space size={4}>
              <Tag color="blue" style={{ fontSize: 11 }}>
                {(f.probabilite_reussite * 100).toFixed(0)}% succès
              </Tag>
              {record.impact_estime_niveaux != null && (
                <Tag color="green" style={{ fontSize: 11 }}>
                  +{record.impact_estime_niveaux} niveau(x)
                </Tag>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Action",
      key: "action_recommandee",
      width: 180,
      render: (_, record) => (
        <Text
          type="secondary"
          style={{ fontSize: 12 }}
          ellipsis={{ tooltip: record.action_recommandee }}
        >
          {record.action_recommandee}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_, record) => (
        <Tooltip title="Voir analyse individuelle">
          <Button
            type="link"
            size="small"
            icon={<UserOutlined />}
            onClick={() => onAnalyzeTeacher(record.enseignant_id)}
          />
        </Tooltip>
      ),
    },
  ], [onAnalyzeTeacher]);

  return (
    <Card
      variant="borderless"
      title={
        <Space>
          <ThunderboltOutlined style={{ color: "#b51200" }} />
          <span>File d'Actions Prioritaires</span>
          {(data || []).length > 0 && (
            <Tag color="red">{data!.length} action(s)</Tag>
          )}
        </Space>
      }
      extra={
        <Select
          value={deptFilter}
          onChange={onDeptChange}
          style={{ minWidth: 180 }}
          size="small"
          allowClear
          placeholder="Tous les départements"
        >
          <Option value="ALL">Tous les départements</Option>
          {departements.filter((d) => d !== "ALL").map((d) => (
            <Option key={d} value={d}>{d}</Option>
          ))}
        </Select>
      }
    >
      <Spin spinning={loading}>
        {(data || []).length > 0 ? (
          <Table<PriorityAction>
            dataSource={data}
            columns={columns}
            rowKey="enseignant_id"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} enseignant(s)` }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty
            description="Aucune action prioritaire en attente"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Spin>
    </Card>
  );
}
