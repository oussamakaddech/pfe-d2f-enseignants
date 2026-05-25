import { Card, Avatar, Typography, Tag, Divider, Statistic, Alert } from "antd";
import { UserOutlined, BulbOutlined } from "@ant-design/icons";
import type { AnalyseData } from "@/models/analyse";

const { Title } = Typography;

interface Props {
  data: AnalyseData;
}

export default function ProfileCard({ data }: Readonly<Props>) {
  const risk = Math.round((data.overallRiskScore || 0) * 100);
  const hasCritical = data.gaps.some((g) => g.gravite === "elevee");

  return (
    <>
      <Card title={<span><UserOutlined /> Profil</span>} className="analyse-card">
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Avatar
            size={72}
            icon={<UserOutlined />}
            style={{ backgroundColor: "#f1f5f9", color: "#B51200", marginBottom: 12 }}
          />
          <Title level={4} style={{ margin: 0 }}>{data.enseignantId}</Title>
          <Tag color="cyan" style={{ marginTop: 8 }}>Horizon 6 mois</Tag>
        </div>
        <Divider />
        <Statistic
          title="Risque Global"
          value={risk}
          suffix="%"
          valueStyle={{ color: (data.overallRiskScore || 0) > 0.7 ? "#ef4444" : "#10b981" }}
        />
      </Card>

      <Card
        title={<span><BulbOutlined /> Insight IA</span>}
        style={{ marginTop: 20 }}
        className="analyse-card"
      >
        <Alert
          message="Action Recommandée"
          type={hasCritical ? "error" : "info"}
          showIcon
          description={
            hasCritical
              ? "Gaps critiques détectés. Une mise à niveau urgente est recommandée."
              : "Profil équilibré. Poursuivez les formations en cours."
          }
        />
      </Card>
    </>
  );
}
