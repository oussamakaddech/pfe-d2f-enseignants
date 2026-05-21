import { useMemo } from "react";
import { Select, Avatar, Space, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { TeacherRiskIndicator } from "@/services/analyse/AnalysePredictiveService";

const { Text } = Typography;

interface Props {
  value?: string;
  onChange: (id: string) => void;
  teachers: TeacherRiskIndicator[];
  loading?: boolean;
  size?: "small" | "middle" | "large";
}

type OptionData = { value: string; label: string; risk: number };

function scoreColor(score: number): string {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.4) return "#f59e0b";
  return "#10b981";
}

function TeacherOption({ data }: Readonly<{ data: OptionData }>) {
  return (
    <Space>
      <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: scoreColor(data.risk ?? 0) }} />
      <Text>{data.label}</Text>
      <Text type="secondary" style={{ fontSize: 11 }}>{data.value}</Text>
    </Space>
  );
}

export default function EnseignantSelect({
  value,
  onChange,
  teachers,
  loading = false,
  size = "large",
}: Readonly<Props>) {
  const options = useMemo(
    () =>
      teachers
        .slice()
        .sort((a, b) => a.teacher_name.localeCompare(b.teacher_name))
        .map((t) => ({
          value: t.teacher_id,
          label: t.teacher_name || t.teacher_id,
          risk: t.attrition_risk_score,
        })),
    [teachers]
  );

  return (
    <Select
      showSearch
      allowClear
      size={size}
      value={value || undefined}
      onChange={(v) => onChange(v || "")}
      placeholder="Rechercher un enseignant (nom ou ID)"
      loading={loading}
      style={{ width: "100%" }}
      optionFilterProp="label"
      filterOption={(input, option) => {
        if (!option) return false;
        const t = input.toLowerCase();
        return (
          String(option.label).toLowerCase().includes(t) ||
          String(option.value).toLowerCase().includes(t)
        );
      }}
      optionRender={(option) => <TeacherOption data={option.data as OptionData} />}
      options={options}
    />
  );
}
