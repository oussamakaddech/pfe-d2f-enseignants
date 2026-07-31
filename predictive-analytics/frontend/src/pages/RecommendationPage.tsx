import { Collapse, Space, Spin, Tag, Typography } from "antd";
import { useState } from "react";
import { useTeacherRecommendations } from "../hooks/useAnalytics";
import { ApiErrorBanner } from "../components/ApiErrorBanner";
import { RecommendationList } from "../components/RecommendationList";
import { TeacherSelector } from "../components/TeacherSelector";

export function RecommendationPage() {
  const [teacherId, setTeacherId] = useState("ENS001");
  const { data, isLoading, error } = useTeacherRecommendations(teacherId);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Typography.Title level={4}>Recommandations de formation</Typography.Title>
      <TeacherSelector value={teacherId} onChange={setTeacherId} />

      {error && <ApiErrorBanner error={error} />}
      {isLoading && <Spin />}

      {data && (
        <>
          <Tag color="blue">{data.recommendations.length} formation(s) recommandée(s)</Tag>
          <RecommendationList result={data} />
          {data.excluded_trainings.length > 0 && (
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: "excluded",
                  label: `Formations exclues (${data.excluded_trainings.length}) — motifs d'éligibilité`,
                  children: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {data.excluded_trainings.map((excluded) => (
                        <div key={excluded.training_id}>
                          <Tag>{excluded.training_id}</Tag> —{" "}
                          <Tag color="orange">{excluded.reason.replace(/_/g, " ")}</Tag>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </>
      )}
    </Space>
  );
}
