import { memo } from "react";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

interface ExportExcelButtonProps {
  onExport: () => Promise<void>;
}

const ExportExcelButton = memo(function ExportExcelButton({ onExport }: ExportExcelButtonProps) {
  return (
    <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
      Exporter en Excel
    </Button>
  );
});

export default ExportExcelButton;






