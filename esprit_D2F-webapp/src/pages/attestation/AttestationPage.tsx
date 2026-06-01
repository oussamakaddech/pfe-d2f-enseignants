import { Card, Typography, Empty } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function AttestationPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <SafetyCertificateOutlined /> Attestations
      </Title>
      <Text style={{ display: "block", marginBottom: 16, color: "#718096" }}>
        Gérez les attestations de formation.
      </Text>
      <Card>
        <Empty description="Aucune attestation disponible" />
      </Card>
    </div>
  );
}
