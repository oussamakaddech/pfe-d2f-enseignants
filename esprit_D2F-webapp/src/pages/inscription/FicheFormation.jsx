import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Badge,
  Spin,
  Alert,
  Typography,
  Row,
  Col,
  Button,
  Space,
  Timeline,
} from "antd";
import {
  InfoCircleOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  AimOutlined,
} from "@ant-design/icons";
import moment from "moment";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import "./FicheFormation.css";

const PERIOD_OPTIONS = [
  { value: "P1", label: "Période 1" },
  { value: "P2", label: "Période 2" },
  { value: "P3", label: "Période 3" },
  { value: "P4", label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER", label: "Autre" },
];

const { Title, Paragraph, Text } = Typography;

export default function FicheFormation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    FormationWorkflowService.getFormationWorkflowById(id)
      .then((data) => setFormation(data))
      .catch((err) => setError(err.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Spin className="fiche-spin" size="large" />;
  }
  if (error) {
    return (
      <Alert
        type="error"
        message="Erreur"
        description={error}
        showIcon
        className="fiche-error"
      />
    );
  }

  const {
    titreFormation,
    typeFormation,
    dateDebut,
    dateFin,
    chargeHoraireGlobal,
    departement1,
    up1,
    seances = [],
    inscriptionsOuvertes,
    objectifs,
    objectifsPedago,
    prerequis,
    acquis,
    indicateurs,
    evalMethods,
    domaine,
    populationCible,
    periodeFormation,
    periodCode,
    customPeriodLabel,
  } = formation;

  const typeColor = {
    INTERNE: "blue",
    EXTERNE: "purple",
  }[String(typeFormation)?.toUpperCase()] || "default";

  return (
    <div className="fiche-page">
      {/* Header */}
      <Row justify="space-between" align="middle" className="fiche-header-row">
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} className="fiche-back-btn">
            Retour
          </Button>
          <Title level={3} className="fiche-header-title">
            <BookOutlined className="fiche-title-icon" />
            {titreFormation}
          </Title>
        </Col>
        <Col>
          <Space>
            <Tag color={typeColor} className="fiche-type-tag">
              {typeFormation || "—"}
            </Tag>
            <Badge
              status={inscriptionsOuvertes ? "success" : "error"}
              text={
                <Tag color={inscriptionsOuvertes ? "success" : "error"}>
                  {inscriptionsOuvertes ? "Inscriptions ouvertes" : "Inscriptions fermées"}
                </Tag>
              }
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Colonne infos générales */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined className="fiche-card-icon" />
                <span className="fiche-card-title-text">Informations générales</span>
              </Space>
            }
            className="fiche-card fiche-card-full"
          >
            <Descriptions column={1} size="middle" layout="horizontal" styles={{ label: { fontWeight: 600, width: 160 } }}>
              <Descriptions.Item label={<Space><CalendarOutlined /> Dates</Space>}>
                <Text strong>
                  {moment(dateDebut).format("DD/MM/YYYY")} → {moment(dateFin).format("DD/MM/YYYY")}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><CalendarOutlined /> Période</Space>}>
                {periodCode === "OTHER" ? (customPeriodLabel || "Autre") : (PERIOD_OPTIONS.find(o => o.value === periodCode)?.label || periodeFormation || "—")}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><ClockCircleOutlined /> Durée</Space>}>
                <Tag color="processing">{chargeHoraireGlobal} heures</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Space><ApartmentOutlined /> Département</Space>}>
                {departement1?.libelle || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><TeamOutlined /> UP</Space>}>
                {up1?.libelle || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><AimOutlined /> Domaine</Space>}>
                {domaine || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={<Space><TeamOutlined /> Public cible</Space>}>
                {populationCible || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Colonne présentation */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <FileTextOutlined className="fiche-card-icon" />
                <span className="fiche-card-title-text">Présentation de la formation</span>
              </Space>
            }
            className="fiche-card"
          >
            {objectifs && (
              <>
                <Title level={5} className="fiche-section-title">
                  <AimOutlined className="fiche-section-icon" />
                  Objectifs généraux
                </Title>
                <Paragraph className="fiche-block fiche-block-primary">
                  {objectifs}
                </Paragraph>
              </>
            )}

            {objectifsPedago && (
              <>
                <Title level={5} className="fiche-section-title">
                  <CheckCircleOutlined className="fiche-section-icon" />
                  Objectifs pédagogiques
                </Title>
                <Paragraph className="fiche-block fiche-block-success">
                  {objectifsPedago}
                </Paragraph>
              </>
            )}

            {prerequis && (
              <>
                <Title level={5} className="fiche-section-title">
                  <InfoCircleOutlined className="fiche-section-icon" />
                  Prérequis
                </Title>
                <Paragraph className="fiche-block fiche-block-info">
                  {prerequis}
                </Paragraph>
              </>
            )}

            {acquis && (
              <>
                <Title level={5} className="fiche-section-title">
                  <CheckCircleOutlined className="fiche-section-icon" />
                  Acquis attendus
                </Title>
                <Paragraph className="fiche-block fiche-block-purple">
                  {acquis}
                </Paragraph>
              </>
            )}

            {evalMethods && (
              <>
                <Title level={5} className="fiche-section-title">
                  <BarChartOutlined className="fiche-section-icon" />
                  Méthodes d&apos;évaluation
                </Title>
                <Paragraph className="fiche-block fiche-block-warning">
                  {evalMethods}
                </Paragraph>
              </>
            )}

            {indicateurs && (
              <>
                <Title level={5} className="fiche-section-title">
                  <BarChartOutlined className="fiche-section-icon" />
                  Indicateurs de réussite
                </Title>
                <Paragraph className="fiche-block fiche-block-teal">
                  {indicateurs}
                </Paragraph>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Timeline des séances */}
      {seances.length > 0 && (
        <Card
          className="fiche-card fiche-seances-card"
          title={
            <Space>
              <CalendarOutlined className="fiche-card-icon" />
              <span className="fiche-card-title-text">Programme des séances ({seances.length})</span>
            </Space>
          }
        >
          <Timeline
            mode="left"
            items={seances.map((s, i) => ({
              label: (
                <Text type="secondary">
                  {moment(s.dateSeance).format("DD/MM/YYYY")}
                  <br />
                  {s.heureDebut?.slice(0, 5)} - {s.heureFin?.slice(0, 5)}
                </Text>
              ),
              children: (
                <div>
                  <Text strong>Séance {i + 1}</Text>
                  {s.titreSeance && <div><Text type="secondary">{s.titreSeance}</Text></div>}
                  {s.salle && <Tag size="small">{s.salle}</Tag>}
                </div>
              ),
              color: i === 0 ? "var(--primary-500)" : "gray",
            }))}
          />
        </Card>
      )}
    </div>
  );
}
