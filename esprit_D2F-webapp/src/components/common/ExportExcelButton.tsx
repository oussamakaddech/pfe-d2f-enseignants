import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

interface ExportExcelButtonProps {
  onExport: () => Promise<void>;
}

function ExportExcelButton({ onExport }: ExportExcelButtonProps) {
  return (
    <Button type="primary" icon={<DownloadOutlined />} onClick={onExport}>
      Exporter en Excel
    </Button>
  );
}

export default ExportExcelButton;






