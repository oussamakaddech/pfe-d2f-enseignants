// GeneratedCertificates.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, List, ListItem, Typography, Link, Button } from "@mui/material";
import CertificateService from "../services/CertificateService";

function GeneratedCertificates() {
  const { formationId } = useParams();
  const [pdfFiles, setPdfFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGeneratedCertificates() {
      try {
        console.log(`🔍 Génération des certificats pour la formation ${formationId}...`);
        const data = await CertificateService.generateCertificates(formationId);
        console.log("✅ Fichiers générés :", data);
        setPdfFiles(data);
      } catch (error) {
        console.error("❌ Erreur lors de la génération des certificats :", error);
      }
    }
    fetchGeneratedCertificates();
  }, [formationId]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Certificats générés
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Formation ID : {formationId}
      </Typography>
      <List>
        {pdfFiles.map((pdfFile, index) => (
          <ListItem key={index}>
            <Link href={`http://localhost:8086/${pdfFile}`} target="_blank" rel="noopener">
              {pdfFile}
            </Link>
          </ListItem>
        ))}
      </List>
      <Button variant="contained" onClick={() => navigate("/home/certificate")}>
        Retour
      </Button>
    </Box>
  );
}

export default GeneratedCertificates;
