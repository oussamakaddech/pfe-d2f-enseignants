import { memo, useMemo } from "react";
import { Select, Avatar, Space, Typography, Divider } from "antd";
import { UserOutlined, BankOutlined } from "@ant-design/icons";
import type { TeacherRiskIndicator } from "@/models/analyse";

const { Text } = Typography;

interface Props {
  value?: string;
  onChange: (id: string) => void;
  teachers: TeacherRiskIndicator[];
  loading?: boolean;
  size?: "small" | "middle" | "large";
}

type OptionData = { value: string; label: string; risk: number; teacher: TeacherRiskIndicator };

function scoreColor(score: number): string {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.4) return "#f59e0b";
  return "#10b981";
}

function TeacherOption({ data }: Readonly<{ data: OptionData }>) {
  return (
    <Space size={8}>
      <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: scoreColor(data.risk ?? 0) }} />
      <Text>{data.label}</Text>
      <Text type="secondary" style={{ fontSize: 11 }}>{data.value}</Text>
    </Space>
  );
}

function renderTeacherOption(
  option: { label?: string; value?: string; data?: { teacher?: TeacherRiskIndicator; label?: string; value?: string } },
) {
  const t = option?.data?.teacher;
  if (!t) return <Text>{option.label}</Text>;
  return (
    <Space size={8}>
      <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: scoreColor(t.attrition_risk_score) }} />
      <Text>{t.teacher_name || t.teacher_id}</Text>
      <Text type="secondary" style={{ fontSize: 11 }}>{t.teacher_id}</Text>
      {t.departement && (
        <>
          <Divider type="vertical" style={{ margin: "0 2px" }} />
          <BankOutlined style={{ fontSize: 10, color: "#999" }} />
          <Text type="secondary" style={{ fontSize: 11 }}>{t.departement}</Text>
        </>
      )}
    </Space>
  );
}

const EnseignantSelect = memo(function EnseignantSelect({
  value,
  onChange,
  teachers,
  loading = false,
  size = "large",
}: Readonly<Props>) {
  const { grouped } = useMemo(() => {
    const sorted = [...teachers].sort((a, b) =>
      (a.departement || "Autres").localeCompare(b.departement || "Autres") ||
      a.teacher_name.localeCompare(b.teacher_name)
    );

    const grouped: { label: string; options: OptionData[] }[] = [];
    let currentDept = "";
    let currentGroup: OptionData[] = [];

    for (const t of sorted) {
      const dept = t.departement || "Autres";
      if (dept !== currentDept) {
        if (currentGroup.length > 0) grouped.push({ label: currentDept, options: currentGroup });
        currentDept = dept;
        currentGroup = [];
      }
      const opt: OptionData = {
        value: t.teacher_id,
        label: t.teacher_name || t.teacher_id,
        risk: t.attrition_risk_score,
        teacher: t,
      };
      currentGroup.push(opt);
    }
    if (currentGroup.length > 0) grouped.push({ label: currentDept, options: currentGroup });

    return { grouped };
  }, [teachers]);

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
      filterOption={(input, option) => {
        if (!option) return false;
        const searchTarget = (option as { label?: string; value?: string }).label ?? (option as { value?: string }).value ?? "";
        const searchInput = input.toLowerCase();
        return (
          String(searchTarget).toLowerCase().includes(searchInput) ||
          String((option as { value?: string }).value ?? "").toLowerCase().includes(searchInput)
        );
      }}
      listHeight={320}
      optionFilterProp="label"
      options={grouped.map((g) => ({
        label: g.label,
        options: g.options.map((o) => ({
          value: o.value,
          label: o.teacher.teacher_name || o.value,
          teacher: o.teacher,
        })),
      }))}
      optionRender={(option) =>
        renderTeacherOption(option as unknown as Parameters<typeof renderTeacherOption>[0])
      }
    />
  );
});

export default EnseignantSelect;