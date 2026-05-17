import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Typography, Tabs, Space, Tag, Spin } from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CommentOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import SeanceCard from "./SeanceCard";
import FormationEvaluationsTab from "./FormationEvaluationsTab";

const { Text } = Typography;

const FormationDetail = () => {
  const { id } = useParams();
  const [formation, setFormation] = useState(null);

  useEffect(() => {
    FormationWorkflowService.getFormationWorkflowById(id)
      .then((data) => setFormation(data))
      .catch((err) =>
        console.error("Erreur récupération détails formation :", err)
      );
  }, [id]);

  if (!formation) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = [
    {
      key: "presences",
      label: (
        <span>
          <CheckCircleOutlined style={{ marginRight: 4 }} />
          Présences
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          {formation.seances && formation.seances.length > 0 ? (
            formation.seances.map((s) => (
              <SeanceCard key={s.idSeance} seance={s} />
            ))
          ) : (
            <Text type="secondary">Aucune séance pour cette formation.</Text>
          )}
        </div>
      ),
    },
    {
      key: "evaluations",
      label: (
        <span>
          <CommentOutlined style={{ marginRight: 4 }} />
          Évaluations
        </span>
      ),
      children: <FormationEvaluationsTab formationId={id} />,
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%", padding: 24 }} size="large">
      <Card variant="borderless" style={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Space direction="vertical" size={4}>
          <Text strong style={{ fontSize: 20 }}>
            <BookOutlined style={{ marginRight: 8, color: "#B51200" }} />
            {formation.titreFormation}
          </Text>
          <Text type="secondary">
            <CalendarOutlined style={{ marginRight: 6 }} />
            Du {new Date(formation.dateDebut).toLocaleDateString()} au{" "}
            {new Date(formation.dateFin).toLocaleDateString()}
          </Text>
          {formation.periodeFormation && (
            <Tag style={{ marginTop: 4 }}>{formation.periodeFormation}</Tag>
          )}
        </Space>
      </Card>

      <Tabs items={tabItems} />
    </Space>
  );
};

export default FormationDetail;
