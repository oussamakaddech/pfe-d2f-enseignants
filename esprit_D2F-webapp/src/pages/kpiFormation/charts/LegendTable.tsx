import { Col, Row, Card, Statistic, Typography } from "antd";

const { Text } = Typography;

interface LegendEntry {
  name: string;
  value: number;
  color: string;
}

interface LegendTableProps {
  entries: LegendEntry[];
  total: number;
  onRowClick: (name: string) => void;
}

export default function LegendTable({ entries, total, onRowClick }: LegendTableProps) {
  return (
    <Row gutter={[16, 16]}>
      {entries.map((entry) => (
        <Col span={24} key={entry.name}>
          <Card
            hoverable
            style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            styles={{ body: { padding: 16 } }}
            onClick={() => onRowClick(entry.name)}
          >
            <Statistic
              title={entry.name}
              value={entry.value}
              valueStyle={{ fontSize: "2rem", fontWeight: "bold", color: entry.color }}
            />
            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              {total > 0
                ? ((entry.value / total) * 100).toFixed(1) + "% du total"
                : "0.0% du total"}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
