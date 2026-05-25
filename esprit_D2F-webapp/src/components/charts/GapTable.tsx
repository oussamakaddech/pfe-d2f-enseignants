import { Table, Tag, Space, Progress, Typography, Tooltip } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import type { AnalyseGap, Gravite } from "@/models/analyse";

const { Text } = Typography;

const graviteColors: Record<Gravite, string> = {
  elevee: "#ef4444",
  moyenne: "#f59e0b",
  faible: "#10b981",
};

interface Props {
  data: AnalyseGap[];
}

export default function GapTable({ data }: Readonly<Props>) {
  const columns = [
    {
      title: "Compétence",
      key: "label",
      render: (_: unknown, r: AnalyseGap) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.competenceLabel}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.competenceCode}</Text>
        </Space>
      ),
    },
    {
      title: "Actuel",
      dataIndex: "niveauActuel",
      width: 110,
      render: (v: number) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor="#94a3b8" />
          <Text style={{ fontSize: 12 }}>{v}/5</Text>
        </Space>
      ),
    },
    {
      title: "Cible",
      dataIndex: "niveauCible",
      width: 110,
      render: (v: number) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress percent={(v / 5) * 100} size="small" showInfo={false} strokeColor="#B51200" />
          <Text style={{ fontSize: 12 }}>{v}/5</Text>
        </Space>
      ),
    },
    {
      title: "Gap",
      dataIndex: "gap",
      width: 80,
      align: "center" as const,
      render: (v: number) => (
        <Text strong style={{ color: v >= 1.5 ? "#ef4444" : "#1e293b", fontSize: 16 }}>
          {v?.toFixed?.(1)}
        </Text>
      ),
    },
    {
      title: "Gravité",
      dataIndex: "gravite",
      width: 110,
      render: (v: Gravite) => (
        <Tag color={graviteColors[v]} style={{ borderRadius: 12, border: "none" }}>
          {v?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Analyse IA",
      dataIndex: "explication",
      render: (v: string) => (
        <Tooltip title={v}>
          <Space>
            <BulbOutlined style={{ color: "#f59e0b" }} />
            <Text type="secondary" ellipsis style={{ maxWidth: 180 }}>{v}</Text>
          </Space>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table<AnalyseGap>
      dataSource={data}
      columns={columns}
      rowKey="competenceCode"
      pagination={false}
      size="middle"
    />
  );
}
