import { useContext, useEffect, useRef, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Row,
  Col,
  Steps,
  Space,
  Tag,
  Result,
  Divider,
} from "antd";
import {
  SaveOutlined,
  ApartmentOutlined,
  TeamOutlined,
  BookOutlined,
  AimOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

import { AuthContext } from "../../context/AuthContext";
import BesoinFormationService from "../../services/BesoinFormationService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";
import "./BesoinForm.css";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 60 : -60, opacity: 0 }),
};

export default function BesoinForm() {
  const { user } = useContext(AuthContext);
  const [form] = Form.useForm();
  const activeRole = String(localStorage.getItem("activeRole") || "").toUpperCase();
  const userRole = String(user?.role || "").toUpperCase();
  const canManageParticipants = ["CUP", "ADMIN"].includes(userRole) || ["CUP", "ADMIN"].includes(activeRole);

  const [msgApi, msgCtx] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const participantsFileInputRef = useRef(null);
  const [lastImportCount, setLastImportCount] = useState(0);
  const participantsText = Form.useWatch("publicCible", form) || "";
  const participantsLines = participantsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const participantsCount = participantsLines.length;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [deptsData, upsData] = await Promise.all([
          DeptService.getAllDepts(),
          UpService.getAllUps(),
        ]);
        setDepartements(deptsData);
        setUps(upsData);
      } catch {
        msgApi.error("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    })();
  }, [msgApi]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true);
      const payload = {
        username: user?.username || user?.userName,
        typeBesoin: values.typeBesoin,
        up: values.up,
        departement: values.departement,
        titre: values.titre,
        objectifFormation: values.objectifFormation,
        propositionAnimateur: values.propositionAnimateur,
        horaireSouhaite: values.horaireSouhaite,
        priorite: values.priorite,
        impactStrategique: values.impactStrategique,
        publicCible: canManageParticipants ? values.publicCible : undefined,
        estOuverte: values.estOuverte || false,
        autresInformations: values.autresInformations,
      };

      await BesoinFormationService.addBesoinFormation(payload);
      msgApi.success("Besoin de formation ajouté avec succès !");
      setSubmitted(true);
      form.resetFields();
      setLastImportCount(0);
      setCurrentStep(0);
    } catch (err) {
      console.error(err);
      msgApi.error("Erreur lors de l'ajout du besoin");
    } finally {
      setSubmitting(false);
    }
  };

  const getStepFields = (step) => {
    switch (step) {
      case 0: return ["up", "departement", "typeBesoin"];
      case 1: return ["titre", "objectifFormation", "priorite", "impactStrategique"];
      case 2: return ["propositionAnimateur", "horaireSouhaite"];
      case 3: return ["estOuverte", "autresInformations"];
      default: return [];
    }
  };

  const importParticipantsFromExcel = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        msgApi.warning("Fichier Excel vide");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) {
        msgApi.warning("Aucune donnée participants trouvée");
        return;
      }

      const [headerRow = [], ...dataRows] = rows;
      const header = headerRow.map((cell) => String(cell || "").trim().toLowerCase());
      const idxNom = header.findIndex((h) => ["nom", "name"].includes(h));
      const idxPrenom = header.findIndex((h) => ["prénom", "prenom", "first name", "firstname"].includes(h));
      const idxEmail = header.findIndex((h) => ["email", "mail"].includes(h));

      const participantsLines = dataRows
        .map((row) => {
          if (!Array.isArray(row)) return "";
          const nom = idxNom >= 0 ? String(row[idxNom] || "").trim() : "";
          const prenom = idxPrenom >= 0 ? String(row[idxPrenom] || "").trim() : "";
          const email = idxEmail >= 0 ? String(row[idxEmail] || "").trim() : "";
          const fallback = String(row[0] || "").trim();

          if (nom || prenom || email) {
            return [nom, prenom].filter(Boolean).join(" ") + (email ? ` <${email}>` : "");
          }
          return fallback;
        })
        .map((line) => line.trim())
        .filter(Boolean);

      const uniqueLines = [...new Set(participantsLines)];
      const currentValue = String(form.getFieldValue("publicCible") || "").trim();
      const merged = [currentValue, ...uniqueLines].filter(Boolean).join("\n");

      form.setFieldsValue({ publicCible: merged });
      setLastImportCount(uniqueLines.length);
      msgApi.success(`${uniqueLines.length} participant(s) importé(s) depuis Excel`);
    } catch {
      msgApi.error("Erreur lors de l'import Excel des participants");
    } finally {
      if (participantsFileInputRef.current) {
        participantsFileInputRef.current.value = "";
      }
    }
  };

  const clearParticipants = () => {
    form.setFieldsValue({ publicCible: "" });
    setLastImportCount(0);
  };

  const formatParticipantsSummary = (rawValue) => {
    const lines = String(rawValue || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return "—";

    const preview = lines.slice(0, 3).join(" | ");
    if (lines.length <= 3) return `${lines.length} participant(s): ${preview}`;
    return `${lines.length} participant(s): ${preview} ...`;
  };

  const next = async () => {
    try {
      await form.validateFields(getStepFields(currentStep));
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } catch {
      // validation failed
    }
  };

  const prev = () => {
    setDirection(-1);
    setCurrentStep(currentStep - 1);
  };

  const typeOptions = [
    { value: "INDIVIDUEL", label: "Individuel", color: "blue" },
    { value: "COLLECTIF", label: "Collectif", color: "purple" },
    { value: "ANIMER_UNE_FORMATION", label: "Animer une formation", color: "orange" },
  ];

  const steps = [
    {
      title: "Contexte",
      description: "UP & Département",
      icon: <ApartmentOutlined />,
      content: (
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <TeamOutlined className="besoin-step-label-icon" />
                  Unité Pédagogique (UP)
                </span>
              }
              name="up"
              rules={[{ required: true, message: "Veuillez sélectionner l'UP" }]}
              className="besoin-form-input"
            >
              <Select placeholder="Sélectionner l'UP" size="large">
                {ups.map((u) => (
                  <Option key={u.id} value={String(u.id)}>
                    {u.name || u.libelle}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <ApartmentOutlined className="besoin-step-label-icon" />
                  Département
                </span>
              }
              name="departement"
              rules={[{ required: true, message: "Veuillez sélectionner le département" }]}
              className="besoin-form-input"
            >
              <Select placeholder="Sélectionner le département" size="large">
                {departements.map((d) => (
                  <Option key={d.id} value={String(d.id)}>
                    {d.name || d.libelle}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            {canManageParticipants && (
              <Form.Item
                label={
                  <span className="besoin-step-label">
                    <TeamOutlined className="besoin-step-label-icon" />
                    Liste des participants
                  </span>
                }
                name="publicCible"
                className="besoin-form-input"
              >
                <>
                  <Space wrap style={{ marginBottom: 12 }}>
                    <Button icon={<UploadOutlined />} onClick={() => participantsFileInputRef.current?.click()}>
                      Importer Excel
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={clearParticipants}
                      disabled={participantsCount === 0}
                    >
                      Effacer la liste
                    </Button>
                  </Space>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">{participantsCount} participant(s)</Tag>
                    {lastImportCount > 0 && <Tag color="green">+{lastImportCount} importé(s)</Tag>}
                  </div>
                  <input
                    ref={participantsFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={importParticipantsFromExcel}
                  />
                  <TextArea
                    rows={5}
                    placeholder="Ajout manuel: un participant par ligne (Nom Prénom <email>)"
                    showCount
                    maxLength={2000}
                  />
                  {participantsCount > 0 && (
                    <>
                      <Divider style={{ margin: "12px 0 8px" }} />
                      <Text type="secondary">
                        Aperçu: {participantsLines.slice(0, 3).join(" | ")}
                        {participantsCount > 3 ? " ..." : ""}
                      </Text>
                    </>
                  )}
                </>
              </Form.Item>
            )}
          </Col>
          <Col xs={24}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <BookOutlined className="besoin-step-label-icon" />
                  Type de besoin
                </span>
              }
              name="typeBesoin"
              rules={[{ required: true, message: "Veuillez sélectionner le type" }]}
              className="besoin-form-input"
            >
              <Select placeholder="Sélectionner le type de besoin" size="large">
                {typeOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    <span className="type-select-option">
                      <Tag color={opt.color}>{opt.label}</Tag>
                    </span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: "Formation",
      description: "Titre & Objectifs",
      icon: <AimOutlined />,
      content: (
        <Row gutter={[24, 16]}>
          <Col xs={24}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <BookOutlined className="besoin-step-label-icon" />
                  Nom de la formation
                </span>
              }
              name="titre"
              rules={[{ required: true, message: "Veuillez saisir le nom de la formation" }]}
              className="besoin-form-input"
            >
        <Input placeholder="Ex : Formation Angular avancé" size="large" autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <AimOutlined className="besoin-step-label-icon" />
                  Objectif de la formation
                </span>
              }
              name="objectifFormation"
              rules={[{ required: true, message: "Veuillez saisir l'objectif" }]}
              className="besoin-form-input"
            >
              <TextArea
                rows={4}
                placeholder="Décrire l'objectif de la formation en détail..."
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <AimOutlined className="besoin-step-label-icon" style={{color: '#faad14'}} />
                  Priorité (Urgence)
                </span>
              }
              name="priorite"
              rules={[{ required: true, message: "Veuillez sélectionner la priorité" }]}
              className="besoin-form-input"
            >
              <Select placeholder="Sélectionner la priorité" size="large">
                <Option value="BASSE">Basse</Option>
                <Option value="MOYENNE">Moyenne</Option>
                <Option value="HAUTE">Haute</Option>
                <Option value="CRITIQUE">Critique</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <AimOutlined className="besoin-step-label-icon" style={{color: '#faad14'}} />
                  Impact Stratégique
                </span>
              }
              name="impactStrategique"
              className="besoin-form-input"
            >
              <Input placeholder="Ex : Alignement avec la stratégie D2F..." size="large" autoComplete="off" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: "Détails",
      description: "Formateur & Horaire",
      icon: <ClockCircleOutlined />,
      content: (
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <UserOutlined className="besoin-step-label-icon" />
                  Proposition de formateur
                </span>
              }
              name="propositionAnimateur"
              className="besoin-form-input"
            >
              <Input placeholder="Nom du formateur proposé (optionnel)" size="large" autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <ClockCircleOutlined className="besoin-step-label-icon" />
                  Horaire souhaité
                </span>
              }
              name="horaireSouhaite"
              className="besoin-form-input"
            >
              <Input placeholder="Ex : Lundi 9h-12h" size="large" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      title: "Paramètres",
      description: "Type & Informations",
      icon: <CheckCircleOutlined />,
      content: (
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <ApartmentOutlined className="besoin-step-label-icon" />
                  Type de formation
                </span>
              }
              name="estOuverte"
              valuePropName="checked"
              className="besoin-form-input"
            >
              <Select placeholder="Ouverte ou fermée ?" size="large">
                <Option value={false}>
                  <Tag color="default">Fermée (pour les participants de l'UP uniquement)</Tag>
                </Option>
                <Option value={true}>
                  <Tag color="green">Ouverte (accessible à d'autres UPs)</Tag>
                </Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label={
                <span className="besoin-step-label">
                  <BookOutlined className="besoin-step-label-icon" />
                  Autres informations
                </span>
              }
              name="autresInformations"
              className="besoin-form-input"
            >
              <TextArea
                rows={4}
                placeholder="Informations additionnelles, spécificités, remarques particulières..."
                showCount
                maxLength={1000}
              />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  const getSummaryData = () => {
    const values = form.getFieldsValue();
    const upObj = ups.find((u) => u.id === Number(values.up));
    const depObj = departements.find((d) => d.id === Number(values.departement));
    const typeLabel = typeOptions.find((t) => t.value === values.typeBesoin)?.label;
    const typeFormation = values.estOuverte ? "Ouverte" : "Fermée";
    return [
      { label: "Unité Pédagogique", value: upObj?.name || upObj?.libelle || values.up, icon: <TeamOutlined /> },
      { label: "Département", value: depObj?.name || depObj?.libelle || values.departement, icon: <ApartmentOutlined /> },
      { label: "Type", value: typeLabel || values.typeBesoin, icon: <BookOutlined /> },
      { label: "Formation", value: values.titre, icon: <BookOutlined /> },
      { label: "Priorité", value: values.priorite, icon: <AimOutlined /> },
      { label: "Objectif", value: values.objectifFormation, icon: <AimOutlined /> },
      { label: "Impact", value: values.impactStrategique || "—", icon: <AimOutlined /> },
      { label: "Formateur proposé", value: values.propositionAnimateur || "—", icon: <UserOutlined /> },
      { label: "Horaire souhaité", value: values.horaireSouhaite || "—", icon: <ClockCircleOutlined /> },
      { label: "Type de formation", value: typeFormation, icon: <CheckCircleOutlined /> },
      ...(canManageParticipants ? [{ label: "Liste des participants", value: formatParticipantsSummary(values.publicCible), icon: <TeamOutlined /> }] : []),
      { label: "Autres informations", value: values.autresInformations || "—", icon: <BookOutlined /> },
    ];
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Spin size="large">
          <div style={{ marginTop: 16 }}>Chargement...</div>
        </Spin>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="besoin-form-container">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="besoin-form-card">
            <Result
              status="success"
              icon={<CheckCircleOutlined className="success-icon" style={{ color: "#52c41a", fontSize: 72 }} />}
              title="Besoin enregistré avec succès !"
              subTitle="Votre demande de formation a été transmise et sera examinée prochainement."
              extra={[
                <Button
                  type="primary"
                  key="list"
                  size="large"
                  className="btn-brand"
                  onClick={() => window.location.href = "/home/besoins"}
                >
                  Voir la liste des besoins
                </Button>,
                <Button
                  key="again"
                  size="large"
                  onClick={() => { setSubmitted(false); form.resetFields(); setCurrentStep(0); }}
                >
                  Ajouter un autre besoin
                </Button>,
              ]}
            />
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {msgCtx}
      <div className="besoin-form-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="besoin-form-card">
            {/* Header */}
            <div className="besoin-form-header">
              <div className="besoin-form-icon">
                <BookOutlined />
              </div>
              <Title level={3} className="besoin-form-title">
                Ajouter un besoin en formation
              </Title>
              <Text className="besoin-form-subtitle">
                Parcourez les étapes pour décrire votre besoin de formation
              </Text>
            </div>

            {/* Steps */}
            <Steps
              current={currentStep}
              className="besoin-steps"
              style={{ marginBottom: 40 }}
              responsive
            >
              {steps.map((s) => (
                <Step key={s.title} title={s.title} description={s.description} icon={s.icon} />
              ))}
            </Steps>

            {/* Form */}
            <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" preserve={true}>
              <AnimatePresence mode="wait" custom={direction}>
                {currentStep < steps.length ? (
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="besoin-step-content"
                  >
                    {steps[currentStep].content}
                  </motion.div>
                ) : (
                  <motion.div
                    key="summary"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                    className="besoin-step-content"
                  >
                    <Title level={4} style={{ textAlign: "center", marginBottom: 24 }}>
                      Récapitulatif de votre demande
                    </Title>
                    <div className="besoin-summary">
                      {getSummaryData().map((item, idx) => (
                        <div key={idx} className="besoin-summary-item">
                          <span className="besoin-summary-label">
                            {item.icon}
                            {item.label}
                          </span>
                          <span className="besoin-summary-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="besoin-form-nav">
                <Space size="large">
                  {currentStep > 0 && (
                    <Button size="large" onClick={prev} icon={<ArrowLeftOutlined />}>
                      Précédent
                    </Button>
                  )}
                  {currentStep < steps.length - 1 && (
                    <Button
                      type="primary"
                      size="large"
                      onClick={next}
                      className="btn-brand"
                      icon={<ArrowRightOutlined />}
                    >
                      Suivant
                    </Button>
                  )}
                  {currentStep === steps.length - 1 && (
                    <Button
                      type="primary"
                      size="large"
                      onClick={next}
                      className="btn-brand"
                      icon={<ArrowRightOutlined />}
                    >
                      Voir le récapitulatif
                    </Button>
                  )}
                  {currentStep === steps.length && (
                    <>
                      <Button size="large" onClick={prev} icon={<ArrowLeftOutlined />}>
                        Modifier
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={submitting}
                        size="large"
                        className="btn-success"
                      >
                        Enregistrer le besoin
                      </Button>
                    </>
                  )}
                </Space>
              </div>
            </Form>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
