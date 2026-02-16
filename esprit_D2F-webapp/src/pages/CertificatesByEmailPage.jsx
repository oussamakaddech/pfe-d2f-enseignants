// src/pages/CertificatesByEmailPage.js
import { useEffect, useState } from "react";
import { Grid, Paper, Typography } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CertificateService from "../services/CertificateService";
import CertificatePdfViewer from "./CertificatePdfViewer";

function CertificatesByEmailPage() {
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await CertificateService.getCertificatesByEmail();
        setCertificates(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des certificats :", error);
      }
    }
    fetchData();
  }, []);

  // Gestion du clic sur une carte
  const handleSelectCertificate = (cert) => {
    setSelectedCertificate(cert);
  };

  return (
    <div style={{ padding: 20 }}>
      <Typography variant="h4" gutterBottom>
        Mes Certificats
      </Typography>

      {/* Affichage des certificats sous forme de cartes */}
      <Grid container spacing={2} sx={{ marginBottom: 4 }}>
        {certificates.map((cert) => {
          // Vérifie si le certificat est sélectionné
          const isSelected =
            selectedCertificate &&
            selectedCertificate.idCertificate === cert.idCertificate;

          return (
            <Grid item xs={12} sm={6} md={3} key={cert.idCertificate}>
              <Paper
                onClick={() => handleSelectCertificate(cert)}
                sx={{
                  width: "100%",
                  height: 200,
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 2,
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: 1,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
                  backgroundColor: isSelected ? "#e0f7fa" : "inherit",
                  "&:hover": {
                    transform: "scale(1.03)",
                    boxShadow: 3,
                  },
                }}
              >
                {/* Partie haute : icône centrée */}
                <div
                  style={{
                    flex: "1 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px",
                  }}
                >
                  <PictureAsPdfIcon sx={{ fontSize: 50, color: "#e53935" }} />
                </div>

                {/* Bandeau bas : titre sur fond gris */}
                <div
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="subtitle2" noWrap>
                    {cert.titreFormation || "Certificat"}
                  </Typography>
                </div>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Affichage du PDF viewer si un certificat est sélectionné */}
      {selectedCertificate && (
        <div style={{ marginTop: 30 ,height: 600, }}>
          <Typography variant="h5" gutterBottom>
            Visualisation du Certificat
          </Typography>
          <CertificatePdfViewer certificate={selectedCertificate} />
        </div>
      )}
    </div>
  );
}

export default CertificatesByEmailPage;
