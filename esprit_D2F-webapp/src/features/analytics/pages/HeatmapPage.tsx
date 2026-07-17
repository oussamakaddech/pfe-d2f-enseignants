import { useState } from "react";
import { Card, Select, Space } from "antd";
import { HeatMapOutlined } from "@ant-design/icons";
import { useHeatmap } from "../hooks/useAnalyticsQueries";
import { Heatmap } from "../components";
import { AppPageHeader } from "@/components/common";

/** Page Heatmap des gaps (département × compétence). */
export default function HeatmapPage() {
  const [dept, setDept] = useState("");
  const heatmap = useHeatmap(dept ? { departement_id: dept } : undefined);

  return (
    <div style={{ padding: 24 }}>
      <AppPageHeader
        icon={<HeatMapOutlined />}
        title="Heatmap des gaps"
        actions={
          <Space>
            <Select
              allowClear
              placeholder="Département"
              style={{ width: 200 }}
              onChange={(v) => setDept(v)}
              options={[{ value: "INF", label: "Informatique" }, { value: "MATH", label: "Mathématiques" }]}
            />
          </Space>
        }
      />
      <Card style={{ borderRadius: 12 }}>
        <Heatmap cells={heatmap.data ?? []} loading={heatmap.isLoading} />
      </Card>
    </div>
  );
}
