// src/components/FormationDetail.jsx
import  { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Typography, Tabs, Space } from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import SeanceCard from "./SeanceCard";
import FormationEvaluationsTab from "./FormationEvaluationsTab";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const FormationDetail = () => {
  const { id } = useParams();
  const [formation, setFormation] = useState(null);
  const [activeKey, setActiveKey] = useState("1");

  useEffect(() => {
    FormationWorkflowService.getFormationWorkflowById(id)
      .then((data) => setFormation(data))
      .catch((err) =>
        console.error("Erreur récupération détails formation :", err)
      );
  }, [id]);

  if (!formation) {
    return (
      <Text style={{ display: "block", textAlign: "center", marginTop: 24 }}>
        Chargement...
      </Text>
    );
  }

  return (
    <Space
      direction="vertical"
      style={{ width: "100%", padding: 24 }}
      size="large"
    >
      <Card bordered>
        <Space direction="vertical">
          <Title level={2}>
            <BookOutlined style={{ marginRight: 8 }} />
            {formation.titreFormation}
          </Title>
          <Text type="secondary">
            <CalendarOutlined style={{ marginRight: 8 }} />
            Du{" "}
            {new Date(formation.dateDebut).toLocaleDateString()} au{" "}
            {new Date(formation.dateFin).toLocaleDateString()}
          </Text>
        </Space>
      </Card>

      <Tabs activeKey={activeKey} onChange={setActiveKey} type="line">
        <TabPane
          key="1"
          tab={
            <span>
              <CheckCircleOutlined />
              Présences
            </span>
          }
        >
          <Title level={4}>Liste des séances</Title>
          {formation.seances && formation.seances.length > 0 ? (
            formation.seances.map((s) => (
              <SeanceCard key={s.idSeance} seance={s} />
            ))
          ) : (
            <Text>Aucune séance pour cette formation.</Text>
          )}
        </TabPane>

        <TabPane
          key="2"
          tab={
            <span>
              <CommentOutlined />
              Évaluations
            </span>
          }
        >
          <Title level={4}>Liste des évaluations</Title>
          <FormationEvaluationsTab formationId={id} />
        </TabPane>
      </Tabs>
    </Space>
  );
};

export default FormationDetail;
