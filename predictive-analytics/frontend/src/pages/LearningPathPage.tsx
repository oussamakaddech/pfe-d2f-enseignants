import { Card, Space, Spin, Typography } from "antd";
import { useState } from "react";
import { useTeacherLearningPath } from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { LearningPathView } from "../components/LearningPathView";
import { TeacherSelector } from "../components/TeacherSelector";

export function LearningPathPage() {
  const [teacherId, setTeacherId] = useState("ENS001");
  const { data, isLoading, error } = useTeacherLearningPath(teacherId);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Parcours de formation recommandé</Typography.Title>
      <TeacherSelector value={teacherId} onChange={setTeacherId} />

      {error && <ApiErrorBanner error={error} />}
      {isLoading && <Spin />}

      {data && (
        <Card size="small" title={`Parcours ordonné — ${data.teacher_id}`}>
          <LearningPathView path={data} />
        </Card>
      )}
    </Space>
  );
}
