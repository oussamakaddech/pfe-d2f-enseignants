import { Card, Progress, Typography, Space } from 'antd';
import type { RiskFactor } from '@/shared/types/teacher';
import { riskColor } from '@/shared/utils/risk';

interface Props {
  factors: RiskFactor[];
}

export function RiskFactors({ factors }: Props) {
  const max = Math.max(...factors.map((f) => f.contribution), 1);
  return (
    <Card title="Facteurs explicatifs du risque" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {factors.map((f) => (
          <div key={f.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text strong>{f.label}</Typography.Text>
              <Typography.Text type="secondary">{f.contribution} pts</Typography.Text>
            </div>
            <Progress
              percent={Math.round((f.contribution / max) * 100)}
              strokeColor={riskColor(f.level)}
              size="small"
            />
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
              {f.description}
            </Typography.Paragraph>
          </div>
        ))}
      </Space>
    </Card>
  );
}
