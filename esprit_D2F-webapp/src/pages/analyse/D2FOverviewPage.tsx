/**
 * Page D2FOverview — Vue "single source of truth" basee sur /api/v1/d2f/*.
 *
 * Cette page utilise UNIQUEMENT :
 *   - D2FDashboard (KPI + at-risk + alerts + recommendations)
 *   - D2FService pour selection enseignant + ml-signal
 *   - RiskBreakdownPanel pour comparaison Score metier vs Signal ML
 *
 * Aucun hook legacy (useDashboard, useAtRisk) n'est utilise ici.
 * Cela garantit la coherence cross-pages et la tracabilite des chiffres.
 */

import { useState } from "react";
import { Card, Select, Space, Typography, Row, Col } from "antd";
import { SafetyCertificateOutlined, BulbOutlined } from "@ant-design/icons";
import D2FDashboard from "@/components/analytics/D2FDashboard";
import RiskBreakdownPanel from "@/components/analytics/RiskBreakdownPanel";
import { useD2FTeachers } from "@/hooks/analyse/useD2FData";

const { Title, Paragraph } = Typography;

export default function D2FOverviewPage() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>(undefined);

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Title level={3} style={{ margin: 0 }}>
            <SafetyCertificateOutlined /> Source unique de vérité D2F
         </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Tous les chiffres ci-dessous proviennent de <code>/api/v1/d2f/*</code> (master dataset).
            Aucune valeur n'est codée en dur. Cohérence garantie avec <code>risk_engine.py</code>.
         </Paragraph>
       </Card>

        <D2FDashboard defaultTeacherId={selectedTeacherId} />

        {selectedTeacherId && (
          <Card
            title={
              <Space>
                <BulbOutlined />
                <span>Decomposition du risque : Score metier vs Signal ML</span>
             </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <RiskBreakdownPanel teacherId={selectedTeacherId} />
             </Col>
           </Row>
         </Card>
        )}

        <Card>
          <Title level={5} style={{ margin: 0 }}>
            Selectionner un enseignant pour voir la decomposition Score metier / Signal ML
         </Title>
          <TeacherSelector
            onChange={(id) => setSelectedTeacherId(id)}
            value={selectedTeacherId}
          />
       </Card>
     </Space>
   </div>
  );
}

function TeacherSelector({
  onChange,
  value,
}: Readonly<{
  onChange: (id: string | undefined) => void;
  value: string | undefined;
}>) {
  // Liste legere via D2FService.listTeachers + hook React Query (pas de fetch direct)
  const { data, isLoading } = useD2FTeachers({ limit: 100 });
  const options = (data?.teachers ?? []).map((t) => ({
    value: t.teacher_id,
    label: `${t.full_name} (${t.risk_level})`,
  }));

  return (
    <Select
      allowClear
      showSearch
      loading={isLoading}
      placeholder="Choisir un enseignant (ex: T001)"
      style={{ width: "100%", maxWidth: 480, marginTop: 12 }}
      value={value}
      onChange={(v) => onChange(v)}
      options={options}
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
    />
  );
}
