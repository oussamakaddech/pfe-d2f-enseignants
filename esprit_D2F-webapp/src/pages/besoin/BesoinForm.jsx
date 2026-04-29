import { useContext, useEffect, useState } from "react";
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
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

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

  const [msgApi, msgCtx] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [submitted, setSubmitted] = useState(false);

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
      };

      await BesoinFormationService.addBesoinFormation(payload);
      msgApi.success("Besoin de formation ajouté avec succès !");
      setSubmitted(true);
      form.resetFields();
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
      default: return [];
    }
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
  ];

  const getSummaryData = () => {
    const values = form.getFieldsValue();
    const upObj = ups.find((u) => u.id === Number(values.up));
    const depObj = departements.find((d) => d.id === Number(values.departement));
    const typeLabel = typeOptions.find((t) => t.value === values.typeBesoin)?.label;
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
