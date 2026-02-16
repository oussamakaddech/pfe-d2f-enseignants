
import axios from "axios";
import { Button } from "@mui/material";

function ExportExcelButton() {
  const handleExportExcel = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8088/formations-workflow/export/excel",
        {
          responseType: "blob", // Pour récupérer le fichier binaire
        }
      );

      // Créer un objet Blob à partir de la réponse
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Créer une URL pour ce Blob
      const url = window.URL.createObjectURL(blob);

      // Créer un lien <a> virtuel pour déclencher le téléchargement
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "formations.xlsx"); // Nom du fichier
      document.body.appendChild(link);

      // Déclencher le téléchargement
      link.click();

      // Nettoyer le DOM et révoquer l'URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export Excel :", error);
      alert("Une erreur est survenue lors de l'export.");
    }
  };

  return (
    <Button variant="contained" color="primary" onClick={handleExportExcel}>
      Exporter en Excel
    </Button>
  );
}

export default ExportExcelButton;
