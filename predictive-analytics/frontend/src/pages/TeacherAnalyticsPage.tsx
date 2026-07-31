import { Card, Col, Row, Space, Spin, Tag, Typography } from "antd";
import { useState } from "react";
import { useTeacherDataQuality, useTeacherGaps, useTeacherRisk } from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { DataQualityView } from "../components/DataQualityView";
import { GapTable } from "../components/GapTable";
import { QualityTag } from "../components/QualityTag";
import { RiskView } from "../components/RiskView";
import { TeacherSelector } from "../components/TeacherSelector";

export function TeacherAnalyticsPage() {
  const [teacherId, setTeacherId] = useState("ENS001");
  const gaps = useTeacherGaps(teacherId);
  const risk = useTeacherRisk(teacherId);
  const quality = useTeacherDataQuality(teacherId);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Analytique enseignant</Typography.Title>
      <TeacherSelector value={teacherId} onChange={setTeacherId} />

      {gaps.error && <ApiErrorBanner error={gaps.error} />}

      {gaps.isLoading && <Spin />}

      {gaps.data && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              size="small"
              title={`Gaps — ${gaps.data.teacher_id}`}
              extra={<QualityTag status={gaps.data.data_quality_status} />}
            >
              <GapTable gaps={gaps.data.gaps} />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card size="small" title="Risque de stagnation" style={{ marginBottom: 16 }}>
              {risk.data ? (
                <RiskView risk={risk.data} />
              ) : risk.error ? (
                <ApiErrorBanner error={risk.error} />
              ) : (
                <Spin />
              )}
            </Card>
            <Card
              size="small"
              title="Qualité des données"
              extra={<QualityTag status={quality.data?.overall_status ?? "NO_DATA"} />}
            >
              {quality.data ? (
                <DataQualityView report={quality.data} />
              ) : quality.error ? (
                <ApiErrorBanner error={quality.error} />
              ) : (
                <Spin />
              )}
            </Card>
          </Col>
        </Row>
      )}

      {gaps.data && gaps.data.gaps.length > 0 && (
        <Tag color="orange">
          {gaps.data.gaps.length} gap(s) détectés — {(gaps.data.warnings ?? []).length} avertissement(s)
        </Tag>
      )}
    </Space>
  );
}
