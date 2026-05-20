import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";

function ExportExcelButton() {
  const { message } = useAppNotification();
  const handleExportExcel = async () => {
    try {
      const response = await FormationWorkflowService.exportFormations("", "");

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "formations.xlsx");
      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export Excel :", error);
      message.error("Une erreur est survenue lors de l'export.");
    }
  };

  return (
    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportExcel}>
      Exporter en Excel
    </Button>
  );
}

export default ExportExcelButton;






