import { Card, Statistic } from "antd";

interface Props {
  title: string;
  value: number | string;
  suffix?: string;
  color?: string;
  precision?: number;
}

export function KpiCard({ title, value, suffix, color, precision }: Props) {
  return (
    <Card size="small">
      <Statistic
        title={title}
        value={value as number}
        suffix={suffix}
        precision={precision}
        valueStyle={color ? { color } : undefined}
      />
    </Card>
  );
}
