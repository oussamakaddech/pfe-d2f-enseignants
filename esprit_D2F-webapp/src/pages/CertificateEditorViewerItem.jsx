// src/components/CertificateEditorViewerItem.jsx
import { useEffect, useState } from "react";
import { Grid, Paper, TextField, Button } from "@mui/material";
import jsPDF from "jspdf";
import PropTypes from "prop-types";
import CertificateService from "../services/CertificateService";

export default function CertificateEditorViewerItem({ certificate, onUpdate }) {
  const [certData, setCertData] = useState(certificate);
  const [pdfUrl, setPdfUrl] = useState("");

// src/components/CertificateEditorViewerItem.jsx
const generatePdfDocument = async (data) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // 1) Selection du template public/assets/img/…
  const isAttestation =
    data.typeCertif?.toUpperCase() === "ATTESTATION" ||
    data.roleEnFormation?.toLowerCase() === "participant";
  const bgUrl = isAttestation
    ? "/assets/img/attestation_bg.png"
    : "/assets/img/certification_bg.png";

  // 2) Chargement du PNG
  const img = new Image();
  img.crossOrigin = "anonymous";   // même origine, c'est ok
  await new Promise((res) => {
    img.onload = res;
    img.src = bgUrl;
  });
  doc.addImage(img, "PNG", 0, 0, w, h);

  // 3) Superposition des champs (aligné à gauche)
  const endDate = new Date(data.dateFinFormation).toLocaleDateString();
  const today   = new Date(data.dateDebutFormation).toLocaleDateString();

  doc.setFont("helvetica", "normal").setTextColor("#000");

  // Nom & Prénom sur la 1ère ligne pointillée
  doc.setFontSize(16);
  doc.text(
    `${data.nomEnseignant} ${data.prenomEnseignant}`,
    450,  // X de départ
    255   // Y
  );

  // Titre formation sur la 2ᵉ ligne
  doc.setFontSize(15);
  doc.text(
    data.titreFormation,
    510,  // X
    305   // Y
  );

  // Date de fin sur la 3ᵉ ligne
  doc.setFontSize(15);
  doc.text(
    ` ${today}-${endDate}`,
    400,  // X
    370   // Y
  );



  return doc.output("bloburl");
};


  // À chaque modification de certData, on régénère l'aperçu
  useEffect(() => {
    if (!certData?.idCertificate) return;
    generatePdfDocument(certData).then(setPdfUrl);
  }, [certData]);

  // Gère la modification dans le formulaire
  const handleChange = (field, value) => {
    setCertData((prev) => {
      const updated = { ...prev, [field]: value };
      onUpdate?.(updated);
      return updated;
    });
  };

  // Sauvegarde côté back
  const handleUpdate = async () => {
    try {
      const { data: updated } =
        await CertificateService.updateCertificate(
          certData.idCertificate,
          certData
        );
      setCertData(updated);
      onUpdate?.(updated);
      alert("Certificat mis à jour !");
    } catch {
      alert("Erreur lors de la mise à jour");
    }
  };

  return (
    <Grid container spacing={2} style={{ marginBottom: 20 }}>
      {/* Aperçu PDF */}
      <Grid item xs={6}>
        <Paper style={{ height: "100%", overflow: "hidden" }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Visualisation du PDF"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            />
          ) : (
            <p>Génération du PDF...</p>
          )}
        </Paper>
      </Grid>

      {/* Formulaire d’édition */}
      <Grid item xs={6}>
        <Paper style={{ padding: 20 }}>
          <TextField
            fullWidth
            label="Titre Formation"
            value={certData.titreFormation}
            onChange={(e) =>
              handleChange("titreFormation", e.target.value)
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Type (CERTIF / ATTESTATION)"
            value={certData.typeCertif}
            onChange={(e) =>
              handleChange("typeCertif", e.target.value)
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Date Début"
            type="date"
            value={certData.dateDebutFormation?.substring(0, 10) || ""}
            onChange={(e) =>
              handleChange("dateDebutFormation", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Date Fin"
            type="date"
            value={certData.dateFinFormation?.substring(0, 10) || ""}
            onChange={(e) =>
              handleChange("dateFinFormation", e.target.value)
            }
            InputLabelProps={{ shrink: true }}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Nom Enseignant"
            value={certData.nomEnseignant}
            onChange={(e) =>
              handleChange("nomEnseignant", e.target.value)
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Prénom Enseignant"
            value={certData.prenomEnseignant}
            onChange={(e) =>
              handleChange("prenomEnseignant", e.target.value)
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Rôle (participant / formateur)"
            value={certData.roleEnFormation}
            onChange={(e) =>
              handleChange("roleEnFormation", e.target.value)
            }
            margin="normal"
          />
          <Button
            variant="contained"
            onClick={handleUpdate}
            style={{ marginTop: 16 }}
          >
            Mettre à jour
          </Button>
        </Paper>
      </Grid>
    </Grid>
  );
}

CertificateEditorViewerItem.propTypes = {
  onUpdate: PropTypes.func,
  certificate: PropTypes.shape({
    idCertificate: PropTypes.number,
    titreFormation: PropTypes.string,
    typeCertif: PropTypes.string,
    dateDebutFormation: PropTypes.string,
    dateFinFormation: PropTypes.string,
    nomEnseignant: PropTypes.string,
    prenomEnseignant: PropTypes.string,
    roleEnFormation: PropTypes.string,
  }),
};

CertificateEditorViewerItem.defaultProps = {
  onUpdate: () => {},
  certificate: {},
};
