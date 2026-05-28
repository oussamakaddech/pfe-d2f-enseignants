// DepartementSelector — department selection UI for UploadStep.
// Extracted from UploadStep.tsx for DSI 200-line compliance.

import { Select, Space, Typography } from "antd";
import { DEPARTMENT_OPTIONS } from "../constants";

const { Text } = Typography;

interface DepartementSelectorProps {
  departement?: string;
  setDepartement?: (dept: string) => void;
}

export default function DepartementSelector({ departement, setDepartement }: Readonly<DepartementSelectorProps>) {
  return (
    <div className="rice-upload-section" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text strong className="rice-section-label">Département</Text>
        <Select
          style={{ width: "100%", maxWidth: 340 }}
          value={departement}
          onChange={setDepartement}
          optionFilterProp="labelText"
          showSearch
          options={[
            { value: "auto", label: "🔍 Détection automatique", labelText: "auto" },
            ...DEPARTMENT_OPTIONS,
          ]}
        />
      </Space>
    </div>
  );
}
