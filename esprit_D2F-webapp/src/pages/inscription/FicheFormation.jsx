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
    return <Spin style={{ display: "block", margin: "4rem auto" }} size="large" />;
  }
  if (error) {
    return (
      <Alert
        type="error"
        message="Erreur"
        description={error}
        showIcon
        style={{ maxWidth: 600, margin: "4rem auto" }}
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
  } = formation;

  const typeColor = {
    INTERNE: "blue",
    EXTERNE: "purple",
  }[String(typeFormation)?.toUpperCase()] || "default";

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            Retour
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: 12, color: "#B51200" }} />
            {titreFormation}
          </Title>
        </Col>
        <Col>
          <Space>
            <Tag color={typeColor} style={{ fontSize: 14, padding: "4px 12px" }}>
              {typeFormation || "—"}
            </Tag>
            <Badge
              status={inscriptionsOuvertes ? "success" : "error"}
              text={
                <Tag color={inscriptionsOuvertes ? "success" : "error"} style={{ fontSize: 14 }}>
                  {inscriptionsOuvertes ? "🟢 Inscriptions ouvertes" : "🔒 Inscriptions fermées"}
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
                <InfoCircleOutlined style={{ color: "#B51200" }} />
                <span style={{ fontWeight: 700 }}>Informations générales</span>
              </Space>
            }
            style={{ borderRadius: 12, height: "100%" }}
          >
            <Descriptions column={1} size="middle" layout="horizontal" labelStyle={{ fontWeight: 600, width: 160 }}>
              <Descriptions.Item label={<Space><CalendarOutlined /> Dates</Space>}>
                <Text strong>
                  {moment(dateDebut).format("DD/MM/YYYY")} → {moment(dateFin).format("DD/MM/YYYY")}
                </Text>
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
                <FileTextOutlined style={{ color: "#B51200" }} />
                <span style={{ fontWeight: 700 }}>Présentation de la formation</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {objectifs && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <AimOutlined style={{ marginRight: 8 }} />
                  Objectifs généraux
                </Title>
                <Paragraph style={{ background: "#fff2f0", padding: 12, borderRadius: 8 }}>
                  {objectifs}
                </Paragraph>
              </>
            )}

            {objectifsPedago && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  Objectifs pédagogiques
                </Title>
                <Paragraph style={{ background: "#f6ffed", padding: 12, borderRadius: 8 }}>
                  {objectifsPedago}
                </Paragraph>
              </>
            )}

            {prerequis && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <InfoCircleOutlined style={{ marginRight: 8 }} />
                  Prérequis
                </Title>
                <Paragraph style={{ background: "#e6f7ff", padding: 12, borderRadius: 8 }}>
                  {prerequis}
                </Paragraph>
              </>
            )}

            {acquis && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <CheckCircleOutlined style={{ marginRight: 8 }} />
                  Acquis attendus
                </Title>
                <Paragraph style={{ background: "#f9f0ff", padding: 12, borderRadius: 8 }}>
                  {acquis}
                </Paragraph>
              </>
            )}

            {evalMethods && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <BarChartOutlined style={{ marginRight: 8 }} />
                  Méthodes d&apos;évaluation
                </Title>
                <Paragraph style={{ background: "#fffbe6", padding: 12, borderRadius: 8 }}>
                  {evalMethods}
                </Paragraph>
              </>
            )}

            {indicateurs && (
              <>
                <Title level={5} style={{ color: "#B51200" }}>
                  <BarChartOutlined style={{ marginRight: 8 }} />
                  Indicateurs de réussite
                </Title>
                <Paragraph style={{ background: "#e6fffb", padding: 12, borderRadius: 8 }}>
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
          style={{ marginTop: 24, borderRadius: 12 }}
          title={
            <Space>
              <CalendarOutlined style={{ color: "#B51200" }} />
              <span style={{ fontWeight: 700 }}>Programme des séances ({seances.length})</span>
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
              color: i === 0 ? "#B51200" : "gray",
            }))}
          />
        </Card>
      )}
    </div>
  );
}
