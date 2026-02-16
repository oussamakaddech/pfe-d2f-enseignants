// src/Pages/Inscription/FicheFormation.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Badge,
  Spin,
  Alert,
  Divider,
  Typography,
  Layout,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import moment from "moment";
import FormationWorkflowService from "../../services/FormationWorkflowService";

const { Title, Paragraph } = Typography;
const { Content } = Layout;

export default function FicheFormation() {
  const { id } = useParams();
  const [formation, setFormation] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    FormationWorkflowService
      .getFormationWorkflowById(id)
      .then((data) => setFormation(data))
      .catch((err) => setError(err.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Spin style={{ display: "block", margin: "4rem auto" }} />;
  }
  if (error) {
    return <Alert type="error" message="Erreur" description={error} showIcon />;
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
  } = formation;

  const premiere = seances[0] || {};

  return (
    <Layout style={{ background: "#f0f2f5", padding: "24px 0" }}>
      <Content>
        <Card
          bordered={false}
          style={{
            maxWidth: 1000,
            margin: "auto",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
          headStyle={{ borderBottom: "none", paddingBottom: 0 }}
          bodyStyle={{ padding: "24px 32px" }}
          title={
  <div
    style={{
      display: "flex",
            alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    }}
  >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <InfoCircleOutlined style={{ fontSize: 32, color: "#1890ff" }} />
            <Title level={2} style={{ margin: 0 }}>
                {titreFormation}
            </Title>
            </div>

            <Tag
            color={inscriptionsOuvertes ? "green" : "red"}
            style={{ fontSize: 14 }}
            >
            {inscriptionsOuvertes ? "Inscriptions ouvertes" : "Inscriptions fermées"}
            </Tag>
        </div>
          }
        >
          <Divider />

          {/* Informations générales */}
          <Title level={4}>Informations générales</Title>
          <Descriptions
            column={{ xs: 1, md: 2 }}
            size="middle"
            bordered
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Type">{typeFormation}</Descriptions.Item>
            <Descriptions.Item label="Durée totale">
              {chargeHoraireGlobal} heures
            </Descriptions.Item>
            <Descriptions.Item label="Dates">
              {moment(dateDebut).format("DD/MM/YYYY")} –{" "}
              {moment(dateFin).format("DD/MM/YYYY")}
            </Descriptions.Item>
            <Descriptions.Item label="Inscriptions ouvertes">
              <Badge
                status={inscriptionsOuvertes ? "success" : "default"}
                text={inscriptionsOuvertes ? "Oui" : "Non"}
              />
            </Descriptions.Item>
            {departement1?.libelle && (
              <Descriptions.Item label="Département">
                {departement1.libelle}
              </Descriptions.Item>
            )}
            {up1?.libelle && (
              <Descriptions.Item label="Unité pédagogique">
                {up1.libelle}
              </Descriptions.Item>
            )}
            {premiere.dateSeance && (
              <Descriptions.Item label="Première séance">
                {moment(premiere.dateSeance).format("DD/MM/YYYY")} de{" "}
                {premiere.heureDebut.slice(0, 5)} à{" "}
                {premiere.heureFin.slice(0, 5)}
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Brochure complète */}
          <Divider />
          <Title level={4}>Présentation de la formation</Title>
          {objectifs && (
            <>
              <Title level={5}>Objectifs généraux</Title>
              <Paragraph>{objectifs}</Paragraph>
            </>
          )}
          {objectifsPedago && (
            <>
              <Title level={5}>Objectifs pédagogiques</Title>
              <Paragraph>{objectifsPedago}</Paragraph>
            </>
          )}
          {prerequis && (
            <>
              <Title level={5}>Prérequis</Title>
              <Paragraph>{prerequis}</Paragraph>
            </>
          )}
          {acquis && (
            <>
              <Title level={5}>Acquis attendus</Title>
              <Paragraph>{acquis}</Paragraph>
            </>
          )}
          {indicateurs && (
            <>
              <Title level={5}>Indicateurs de réussite</Title>
              <Paragraph>{indicateurs}</Paragraph>
            </>
          )}
          {evalMethods && (
            <>
              <Title level={5}>Méthodes d’évaluation</Title>
              <Paragraph>{evalMethods}</Paragraph>
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
