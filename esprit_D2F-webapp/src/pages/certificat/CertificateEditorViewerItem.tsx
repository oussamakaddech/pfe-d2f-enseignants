import { useEffect, useState } from "react";
import { Row, Col, Card, Input, Button, Form, Spin } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import jsPDF from "jspdf";
import { useUpdateCertificate } from "@/hooks/certificat/useCertificats";

export default function CertificateEditorViewerItem({ certificate, onUpdate }: any) {
  const { message } = useAppNotification();
  const [certData, setCertData] = useState(certificate);
  const [pdfUrl, setPdfUrl] = useState("");

// src/components/CertificateEditorViewerItem.jsx
const generatePdfDocument = async (data: any) => {
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
    generatePdfDocument(certData).then((url: any) => setPdfUrl(url.toString()));
  }, [certData]);

  // Gère la modification dans le formulaire
  const handleChange = (field: any, value: any) => {
    setCertData((prev: any) => {
      const updated = { ...prev, [field]: value };
      onUpdate?.(updated);
      return updated;
    });
  };

  const { mutateAsync: updateCertificate } = useUpdateCertificate();

  // Sauvegarde côté back
  const handleUpdate = async () => {
    try {
      const { data: updated } =
        await updateCertificate(
          { id: certData.idCertificate, data: certData }
        );
      setCertData(updated);
      onUpdate?.(updated);
      message.success("Certificat mis à jour !");
    } catch {
      message.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <Row gutter={16} style={{ marginBottom: 20 }}>
      {/* Aperçu PDF */}
      <Col span={12}>
        <Card style={{ height: "100%", overflow: "hidden" }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Visualisation du PDF"
              width="100%"
              height="500"
              style={{ border: "none" }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin tip="Génération du PDF..."><div /></Spin>
            </div>
          )}
        </Card>
      </Col>

      {/* Formulaire d’édition */}
      <Col span={12}>
        <Card style={{ padding: 20 }}>
          <Form layout="vertical">
            <Form.Item label="Titre Formation">
              <Input
                value={certData.titreFormation}
                onChange={(e) => handleChange("titreFormation", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Type (CERTIF / ATTESTATION)">
              <Input
                value={certData.typeCertif}
                onChange={(e) => handleChange("typeCertif", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Date Début">
              <Input
                type="date"
                value={certData.dateDebutFormation?.substring(0, 10) || ""}
                onChange={(e) => handleChange("dateDebutFormation", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Date Fin">
              <Input
                type="date"
                value={certData.dateFinFormation?.substring(0, 10) || ""}
                onChange={(e) => handleChange("dateFinFormation", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Nom Enseignant">
              <Input
                value={certData.nomEnseignant}
                onChange={(e) => handleChange("nomEnseignant", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Prénom Enseignant">
              <Input
                value={certData.prenomEnseignant}
                onChange={(e) => handleChange("prenomEnseignant", e.target.value)}
              />
            </Form.Item>
            <Form.Item label="Rôle (participant / formateur)">
              <Input
                value={certData.roleEnFormation}
                onChange={(e) => handleChange("roleEnFormation", e.target.value)}
              />
            </Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleUpdate}
              style={{ marginTop: 8 }}
            >
              Mettre à jour
            </Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}








