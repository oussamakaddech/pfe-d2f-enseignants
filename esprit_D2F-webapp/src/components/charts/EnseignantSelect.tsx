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

export default function EnseignantSelect({
  value,
  onChange,
  teachers,
  loading = false,
  size = "large",
}: Props) {
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
      optionRender={(option) => {
        const score = (option.data as { risk?: number }).risk ?? 0;
        const color = score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f59e0b" : "#10b981";
        return (
          <Space>
            <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: color }} />
            <Text>{String(option.label)}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {String(option.value)}
            </Text>
          </Space>
        );
      }}
      options={options}
    />
  );
}
