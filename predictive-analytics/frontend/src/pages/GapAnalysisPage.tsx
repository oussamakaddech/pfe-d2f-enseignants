import { Card, Col, Row, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { useTeacherGaps } from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { GapTable, severityCounts } from "../components/GapTable";
import { KpiCard } from "../components/KpiCard";
import { TeacherSelector } from "../components/TeacherSelector";

export function GapAnalysisPage() {
  const [teacherId, setTeacherId] = useState("ENS001");
  const { data, isLoading, error } = useTeacherGaps(teacherId);

  const counts = data ? severityCounts(data.gaps) : null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Analyse des gaps de compétences</Typography.Title>
      <TeacherSelector value={teacherId} onChange={setTeacherId} />

      {error && <ApiErrorBanner error={error} />}
      {isLoading && <Spin />}

      {data && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><KpiCard title="Total gaps" value={data.gaps.length} /></Col>
            <Col xs={12} md={6}><KpiCard title="Critiques" value={counts?.CRITICAL ?? 0} color={(counts?.CRITICAL ?? 0) > 0 ? "#f5222d" : undefined} /></Col>
            <Col xs={12} md={6}><KpiCard title="Élevés" value={counts?.HIGH ?? 0} color={(counts?.HIGH ?? 0) > 0 ? "#fa8c16" : undefined} /></Col>
            <Col xs={12} md={6}><KpiCard title="Moyens / Faibles" value={(counts?.MEDIUM ?? 0) + (counts?.LOW ?? 0)} /></Col>
          </Row>
          <Card size="small" title={`Diagnostic détaillé — ${data.teacher_id}`}>
            <GapTable gaps={data.gaps} />
          </Card>
        </>
      )}
    </Space>
  );
}
