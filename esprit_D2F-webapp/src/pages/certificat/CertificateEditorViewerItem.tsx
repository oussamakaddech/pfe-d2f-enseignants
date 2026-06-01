import { useEffect, useState } from "react";
import { Row, Col, Card, Input, Button, Form, Spin } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import jsPDF from "jspdf";
import { useUpdateCertificate } from "@/hooks/certificat/useCertificats";
import type { Certificate } from "@/models/certificat";

interface CertificateEditorViewerItemProps {
  certificate?: Certificate;
  onUpdate?: (cert: Certificate) => void;
}

export default function CertificateEditorViewerItem({ certificate, onUpdate }: Readonly<CertificateEditorViewerItemProps>) {
  const { message } = useAppNotification();
  const [certData, setCertData] = useState<Certificate | undefined>(certificate);
  const [pdfUrl, setPdfUrl] = useState("");

const generatePdfDocument = async (data: Certificate) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const isAttestation =
    data.typeCertif?.toUpperCase() === "ATTESTATION" ||
    data.roleEnFormation?.toLowerCase() === "participant";
  const bgUrl = isAttestation
    ? "/assets/img/attestation_bg.png"
    : "/assets/img/certification_bg.png";

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res) => {
    img.onload = () => res();
    img.onerror = () => res();
    img.src = bgUrl;
  });
  doc.addImage(img, "PNG", 0, 0, w, h);

  const endDate = data.dateFinFormation ? new Date(data.dateFinFormation).toLocaleDateString() : "";
  const today = data.dateDebutFormation ? new Date(data.dateDebutFormation).toLocaleDateString() : "";

  doc.setFont("helvetica", "normal").setTextColor("#000");

  doc.setFontSize(16);
  doc.text(
    `${data.nomEnseignant || ""} ${data.prenomEnseignant || ""}`,
    450, 255
  );

  doc.setFontSize(15);
  doc.text(
    data.titreFormation || "",
    510, 305
  );

  doc.setFontSize(15);
  doc.text(
    ` ${today}-${endDate}`,
    400, 370
  );

  return doc.output("bloburl");
};


  // À chaque modification de certData, on régénère l'aperçu
  useEffect(() => {
    if (!certData?.idCertificate) return;
    if (certData) generatePdfDocument(certData).then((url: URL | string) => setPdfUrl(url.toString()));
  }, [certData]);

  // Gère la modification dans le formulaire
  const handleChange = (field: string, value: string) => {
    setCertData((prev) => {
      const updated = { ...prev, [field]: value };
      onUpdate?.(updated);
      return updated;
    });
  };

  const { mutateAsync: updateCertificate } = useUpdateCertificate();

  const handleUpdate = async () => {
    if (!certData?.idCertificate) return;
    try {
      const { data: updated } =
        await updateCertificate(
          { id: certData.idCertificate, data: certData as Certificate }
        );
      setCertData(updated);
      onUpdate?.(updated);
      message.success("Certificat mis à jour !");
    } catch {
      message.error("Erreur lors de la mise à jour");
    }
  };

  if (!certData) return null;

  return (
    <Row gutter={16} style={{ marginBottom: 20 }}>
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








