// src/pages/CompletedFormations.jsx
import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Select,
  Space,
  Drawer,
  DatePicker,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import useAppNotification from "../hooks/useAppNotification";
import { AppPageHeader, brand } from "../theme";
import "./CompletedFormations.css";

import FormationWorkflowService from "../services/FormationWorkflowService";
import FormationCustomService from "../services/FormationCustomService";
import FormationReportService from "../services/FormationReportService";
import EnseignantService from "../services/EnseignantService";
import CertificateService from "../services/CertificateService";
import UpService from "../services/upService";
import DeptService from "../services/DeptService";

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function CompletedFormations() {
  // États principaux
  const { message } = useAppNotification();
  const [formations, setFormations] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingButtons, setLoadingButtons] = useState({});
  const [typeCertif, setTypeCertif] = useState("CERTIF");
  const navigate = useNavigate();

  // Filtres UP & Département
  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);

  // Drawer PDF-attestation
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [enseignants, setEnseignants] = useState([]);
  const [loadingEns, setLoadingEns] = useState(false);
  const [selectedEns, setSelectedEns] = useState(null);
  const [attType, setAttType] = useState("PARTICIPATION");
  const [period, setPeriod] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);

  // Drawer création de certificat individuel
  const [newCertDrawerVisible, setNewCertDrawerVisible] = useState(false);
  const [newCertFormationId, setNewCertFormationId] = useState(null);
  const [newCertEnseignants, setNewCertEnseignants] = useState([]);
  const [loadingNewCertEns, setLoadingNewCertEns] = useState(false);
  const [selectedNewCertEns, setSelectedNewCertEns] = useState(null);

  // Chargement initial
  useEffect(() => {
    setLoadingTable(true);
    FormationWorkflowService.getFormationsAchevees()
      .then(setFormations)
      .catch(() => message.error("Impossible de charger les formations achevées."))
      .finally(() => setLoadingTable(false));

    UpService.getAllUps().then(setUps).catch(() => {});
    DeptService.getAllDepts().then(setDepts).catch(() => {});
  }, []);

  // Génération de certificats batch
  const handleGenerateCertificate = async (record) => {
    const id = record.idFormation;
    setLoadingButtons((prev) => ({ ...prev, [id]: true }));
    try {
      await FormationCustomService.generateCertificates(id, typeCertif);
      message.success("Certificats générés !");
      setFormations((prev) =>
        prev.map((f) =>
          f.idFormation === id ? { ...f, certifGenerated: true } : f
        )
      );
      navigate(`/home/certificate/${id}`);
    } catch (error) {
      const resp = error.response;
      if (
        resp?.status === 409 &&
        typeof resp.data === "string" &&
        resp.data.includes("déjà été générés")
      ) {
        message.info(resp.data);
        navigate(`/home/certificate/${id}`);
      } else {
        message.error("Échec de la génération des certificats.");
      }
    } finally {
      setLoadingButtons((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Ouvre le Drawer PDF-attestation
  const openDrawer = () => {
    setPdfUrl(null);
    setSelectedEns(null);
    setPeriod([]);
    setDrawerVisible(true);
    setLoadingEns(true);
    EnseignantService.getAllEnseignants()
      .then(setEnseignants)
      .catch(() => message.error("Impossible de charger les enseignants."))
      .finally(() => setLoadingEns(false));
  };

  // Génère **seulement** la page tableau en PDF
  const generateTableOnly = async () => {
    if (!selectedEns || period.length !== 2) {
      return message.warning("Sélectionnez un formateur et une période.");
    }
    const role = attType === "ANIMATION" ? "animateur" : "participant";
    const ensId = selectedEns.id;
    const [start, end] = period.map((d) => d.format("YYYY-MM-DD"));

    try {
      const items = await FormationReportService.getFormationsParRoleEtPeriode(
        role,
        ensId,
        start,
        end
      );
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("times", "normal").setFontSize(12);

      const headers =
        attType === "ANIMATION"
          ? ["Formation", "Formateur(s)", "Date", "Nb.h", "Public cible", "Objectifs"]
          : ["Formation", "Formateur", "Date"];
      const body = items.map((f) => {
        const noms = Array.isArray(f.formateurs)
          ? f.formateurs.map((fr) => `${fr.nom} ${fr.prenom}`).join(", ")
          : "";
        return attType === "ANIMATION"
          ? [
              f.titreFormation,
              noms,
              f.dateDebut,
              `${f.chargeHoraireGlobal || ""} h`,
              f.populationCible,
              f.objectifs,
            ]
          : [f.titreFormation, noms, f.dateDebut];
      });

      autoTable(doc, {
        startY: 40,
        margin: { left: 40, right: 40 },
        head: [headers],
        body,
        theme: "grid",
        styles: {
          font: "times",
          fontSize: 12,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        columnStyles:
          attType === "ANIMATION"
            ? { 0: { cellWidth: 100 }, 1: { cellWidth: 100 }, 2: { cellWidth: 60 }, 3: { cellWidth: 50 }, 4: { cellWidth: 80 }, 5: { cellWidth: 140 } }
            : { 0: { cellWidth: 200 }, 1: { cellWidth: 200 }, 2: { cellWidth: 100 } },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: 20,
          halign: "center",
        },
        bodyStyles: {
          valign: "top",
        },
      });

      setPdfUrl(doc.output("bloburl"));
    } catch (e) {
      console.error(e);
      message.error("Échec de la génération du tableau PDF.");
      setDrawerVisible(false);
    }
  };

  // Ouvre le Drawer de création d'un certificat individuel
  const openNewCertDrawer = (formationId) => {
    setNewCertFormationId(formationId);
    setSelectedNewCertEns(null);
    setLoadingNewCertEns(true);
    setNewCertDrawerVisible(true);
    EnseignantService.getAllEnseignants()
      .then(setNewCertEnseignants)
      .catch(() => message.error("Impossible de charger les enseignants."))
      .finally(() => setLoadingNewCertEns(false));
  };

  // Crée un certificat individuel
  const handleCreateCertificate = async () => {
    if (!selectedNewCertEns) return;
    try {
      const formation = formations.find((f) => f.idFormation === newCertFormationId);
      const ens = selectedNewCertEns;
      const payload = {
        formationId: formation.idFormation,
        titreFormation: formation.titreFormation,
        typeCertif,
        dateDebutFormation: formation.dateDebut,
        dateFinFormation: formation.dateFin,
        chargeHoraireGlobal: formation.chargeHoraireGlobal,
        enseignantId: ens.id,
        nomEnseignant: ens.nom,
        prenomEnseignant: ens.prenom,
        mailEnseignant: ens.mail,
        deptEnseignant: ens.departement1?.libelle || ens.dept?.libelle || "",
        roleEnFormation: "PARTICIPANT",
      };
      await CertificateService.createCertificate(payload);
      message.success("Certificat créé !");
      setNewCertDrawerVisible(false);
    } catch (e) {
      console.error(e);
      message.error("Échec de la création du certificat.");
    }
  };

  // Colonnes du tableau principal
  const columns = [
    { title: "Titre Formation", dataIndex: "titreFormation", key: "titreFormation" },
    { title: "État", dataIndex: "etatFormation", key: "etatFormation" },
    { title: "UP", dataIndex: ["up1", "libelle"], key: "up" },
    { title: "Département", dataIndex: ["departement1", "libelle"], key: "departement" },
    { title: "Date Début", dataIndex: "dateDebut", key: "dateDebut" },
    { title: "Date Fin", dataIndex: "dateFin", key: "dateFin" },
    {
      title: "Action",
      key: "action",
      render: (_, rec) => (
        <Space size={4}>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            loading={loadingButtons[rec.idFormation]}
            disabled={rec.certifGenerated}
            onClick={() => handleGenerateCertificate(rec)}
            className="completed-btn-generate"
          >
            Générer
          </Button>
          {rec.certifGenerated && (
            <Button
              icon={<EyeOutlined />}
              onClick={() => navigate(`/home/certificate/${rec.idFormation}`)}
              className="completed-btn-view"
            >
              Voir
            </Button>
          )}
          <Button
            icon={<PlusOutlined />}
            onClick={() => openNewCertDrawer(rec.idFormation)}
            className="completed-btn-add"
          >
            Ajouter
          </Button>
        </Space>
      ),
    },
  ];

  // Colonnes pour la sélection d'enseignant
  const ensColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Nom", dataIndex: "nom", key: "nom" },
    { title: "Prénom", dataIndex: "prenom", key: "prenom" },
    { title: "Email", dataIndex: "mail", key: "mail" },
  ];

  // Stats
  const certifCount = formations.filter(f => f.certifGenerated).length;
  const pendingCount = formations.length - certifCount;

  return (
    <div className="completed-page">
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Formations Achevées"
        subtitle={`${formations.length} formation${formations.length !== 1 ? "s" : ""} terminée${formations.length !== 1 ? "s" : ""} — Générez certificats et attestations`}
      />

      {/* Statistiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="Total Achevées"
              value={formations.length}
              prefix={<CheckCircleOutlined style={{ color: brand[500] }} />}
              valueStyle={{ color: brand[500], fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="Certificats Générés"
              value={certifCount}
              prefix={<FileProtectOutlined style={{ color: "#059669" }} />}
              valueStyle={{ color: "#059669", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="completed-stat-card">
            <Statistic
              title="En Attente"
              value={pendingCount}
              prefix={<TeamOutlined style={{ color: "#f59e0b" }} />}
              valueStyle={{ color: "#f59e0b", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <div className="completed-toolbar">
        <Text className="completed-toolbar-label">Type de certificat :</Text>
        <Select value={typeCertif} onChange={setTypeCertif} style={{ width: 180 }}>
          <Option value="CERTIF">Certificat</Option>
          <Option value="BADGE">Badge</Option>
          <Option value="ATTESTATION">Attestation</Option>
        </Select>
        <Button icon={<FilePdfOutlined />} onClick={openDrawer} className="completed-btn-pdf">
          Générer tableau
        </Button>
      </div>

      {/* Tableau */}
      <Card className="completed-table-card">
        <Table
          dataSource={formations}
          columns={columns}
          rowKey="idFormation"
          loading={loadingTable}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `${total} formation${total !== 1 ? "s" : ""}` }}
          locale={{ emptyText: "Aucune formation achevée" }}
        />
      </Card>

      {/* Drawer pour PDF */}
      <Drawer
        title={<span style={{ fontWeight: 600 }}>Tableau PDF</span>}
        width={pdfUrl ? 800 : 600}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setPdfUrl(null);
        }}
        footer={
          !pdfUrl && (
            <div className="completed-drawer-footer">
              <Button
                onClick={() => {
                  setDrawerVisible(false);
                  setPdfUrl(null);
                }}
              >
                Annuler
              </Button>
              <Button
                type="primary"
                disabled={!selectedEns || period.length !== 2}
                onClick={generateTableOnly}
              >
                Générer PDF
              </Button>
            </div>
          )
        }
      >
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="PDF Tableau"
            style={{ width: "100%", height: "80vh", border: "none" }}
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Table
              title={() => "Sélectionnez le formateur"}
              dataSource={enseignants}
              columns={ensColumns}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedEns ? [selectedEns.id] : [],
                onChange: (_, rows) => setSelectedEns(rows[0]),
                getRowKey: (r) => r.id,
              }}
              loading={loadingEns}
              pagination={{ pageSize: 5 }}
              rowKey="id"
              size="small"
            />
            <Space>
              <span>Type :</span>
              <Select value={attType} onChange={setAttType} style={{ width: 180 }}>
                <Option value="PARTICIPATION">Participation</Option>
                <Option value="ANIMATION">Animation</Option>
              </Select>
            </Space>
            <Space>
              <span>Période :</span>
              <RangePicker onChange={(dates) => setPeriod(dates)} />
            </Space>
          </Space>
        )}
      </Drawer>

      {/* Drawer pour création de certificat individuel */}
      <Drawer
        title={<span style={{ fontWeight: 600 }}>Ajouter un Certificat</span>}
        width={400}
        open={newCertDrawerVisible}
        onClose={() => setNewCertDrawerVisible(false)}
        footer={
          <div className="completed-drawer-footer">
            <Button onClick={() => setNewCertDrawerVisible(false)}>
              Annuler
            </Button>
            <Button
              type="primary"
              disabled={!selectedNewCertEns}
              onClick={handleCreateCertificate}
            >
              Créer certificat
            </Button>
          </div>
        }
      >
        <Table
          title={() => "Sélectionnez l'enseignant"}
          dataSource={newCertEnseignants}
          columns={ensColumns}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedNewCertEns ? [selectedNewCertEns.id] : [],
            onChange: (_, rows) => setSelectedNewCertEns(rows[0]),
            getRowKey: (r) => r.id,
          }}
          loading={loadingNewCertEns}
          pagination={{ pageSize: 5 }}
          rowKey="id"
          size="small"
        />
      </Drawer>
    </div>
  );
}
