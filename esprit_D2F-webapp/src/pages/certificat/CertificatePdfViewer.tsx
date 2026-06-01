import { useEffect, useState } from "react";
import jsPDF from "jspdf";

interface CertificatePdfData {
  idCertificate: number;
  titreFormation?: string;
  typeCertif?: string;
  roleEnFormation?: string;
  dateDebutFormation?: string;
  dateFinFormation?: string;
  nomEnseignant: string;
  prenomEnseignant: string;
}

interface CertificatePdfViewerProps {
  certificate?: CertificatePdfData;
}

function CertificatePdfViewer({ certificate }: Readonly<CertificatePdfViewerProps>) {
  const [pdfUrl, setPdfUrl] = useState("");

  useEffect(() => {
    if (!certificate) return;

    const generatePdf = async () => {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();

      // 1) Sélection dynamique du template
      const isAttestation =
        certificate.typeCertif?.toUpperCase() === "ATTESTATION" ||
        certificate.roleEnFormation?.toLowerCase() === "participant";
      const bgUrl = isAttestation
        ? "/assets/img/attestation_bg.png"
        : "/assets/img/certification_bg.png";

      // 2) Chargement du fond
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        img.src = bgUrl;
      });
      try {
        doc.addImage(img, "PNG", 0, 0, w, h);
      } catch {
        // background image not available, continue without it
      }

      // 3) Superposition des champs (alignés à gauche)
      const debut = certificate.dateDebutFormation
        ? new Date(certificate.dateDebutFormation).toLocaleDateString("fr-FR")
        : "";
      const fin = certificate.dateFinFormation
        ? new Date(certificate.dateFinFormation).toLocaleDateString("fr-FR")
        : "";
      const today = new Date().toLocaleDateString("fr-FR");

      doc.setFont("helvetica", "normal").setTextColor("#000");

      // — Nom & Prénom (1ʳᵉ ligne pointillée)
      doc.setFontSize(16);
      doc.text(
        `${certificate.nomEnseignant || ""} ${certificate.prenomEnseignant || ""}`,
        450,  // X de départ
        255   // Y
      );

      // — Titre de la formation (2ᵉ ligne pointillée)
      doc.setFontSize(15);
      doc.text(
        certificate.titreFormation || "",
        510, // X
        305  // Y
      );

      // — Période (3ᵉ ligne pointillée)
      doc.setFontSize(15);
      doc.text(
        `${debut} – ${fin}`,
        400, // X
        370  // Y
      );

      // — “Fait à Tunis le …” (bas-gauche)
      doc.setFontSize(12);
      doc.text(
        `Fait à Tunis le ${today}`,
        60,     // X
        h - 40  // Y
      );

      setPdfUrl(doc.output("bloburl").toString());
    };

    generatePdf();
  }, [certificate]);

  if (!certificate) return null;
  if (!pdfUrl) return <p>Génération du PDF…</p>;

  return (
    <div style={{ width: "100%", height: "100%", border: "1px solid #ccc" }}>
      <iframe
        src={pdfUrl}
        title="Certificat PDF"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      />
    </div>
  );
}



export default CertificatePdfViewer;
export type { CertificatePdfViewerProps, CertificatePdfData };








