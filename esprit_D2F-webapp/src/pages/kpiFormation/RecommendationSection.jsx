// src/components/KPI/RecommendationSection.jsx

import { useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Spin,
  Alert,
  List,
} from "antd";
import AIRecoService from "../../services/aiRecoService";

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function RecommendationSection() {
  // États
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");

  const handleGenerate = async (values) => {
    setError("");
    setSuggestions([]);
    setLoading(true);

    try {
      const payload = {
        domaine: values.domaine || null,
        objectif: values.objectif,
        objectifPedagogique: values.objectifPedagogique,
        topN: values.topN,
      };
      const recos = await AIRecoService.recommend(payload);
      setSuggestions(recos);
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer les suggestions. Vérifiez la console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      variant="borderless"
      style={{ marginTop: 40, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
    >
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        🤖 Suggestions de Formateurs
      </Title>

      <Row gutter={32}>
        {/* Colonne gauche : explications */}
        <Col xs={24} md={10}>
          <Title level={5}>Comment ça marche ?</Title>
          <Paragraph>
            Renseignez le contexte de votre nouvelle formation pour obtenir une liste
            de formateurs recommandés :
          </Paragraph>
          <ol style={{ paddingLeft: 20 }}>
            <li>
              <Text strong>Domaine (optionnel)</Text> : ex. « Data Science ».
            </li>
            <li>
              <Text strong>Objectif</Text> : ex. « Maîtriser React en 2 jours ».
            </li>
            <li>
              <Text strong>Objectif pédagogique</Text> : ex. « Créer des hooks ».
            </li>
            <li>
              <Text strong>Nombre de suggestions</Text> (top N).
            </li>
            <li>
              Cliquez sur <Text code>Générer</Text> pour lancer la recommandation.
            </li>
          </ol>
        </Col>

        {/* Colonne droite : formulaire */}
        <Col xs={24} md={14}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ topN: 5 }}
            onFinish={handleGenerate}
          >
            <Form.Item label="Domaine (optionnel)" name="domaine">
              <Input placeholder="Ex : Développement Web" />
            </Form.Item>

            <Form.Item
              label="Objectif (obligatoire)"
              name="objectif"
              rules={[{ required: true, message: "L’objectif est requis" }]}
            >
              <TextArea rows={2} placeholder="Décrivez brièvement l’objectif" />
            </Form.Item>

            <Form.Item
              label="Objectif pédagogique (obligatoire)"
              name="objectifPedagogique"
              rules={[{ required: true, message: "L’objectif pédagogique est requis" }]}
            >
              <TextArea rows={2} placeholder="Précisez l’objectif pédagogique" />
            </Form.Item>

            <Form.Item
              label="Nombre de suggestions"
              name="topN"
              rules={[{ type: "number", min: 1, max: 20 }]}
            >
              <InputNumber min={1} max={20} style={{ width: 100 }} />
            </Form.Item>

            {error && (
              <Form.Item>
                <Alert type="error" message={error} showIcon />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                Générer les suggestions
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>

      {/* Résultats */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : suggestions.length > 0 ? (
        <List
          style={{ marginTop: 24 }}
          bordered
          dataSource={suggestions}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={`${item.nom} ${item.prenom}`}
                description={
                  <>
                    <div>Email : {item.mail}</div>
                    <div>
                      UP : {item.up_libelle || "—"} &nbsp;|&nbsp; Dept :{" "}
                      {item.dept_libelle || "—"}
                    </div>
                  </>
                }
              />
              <div>
                <Text strong>Score</Text> : {item.score.toFixed(3)}
              </div>
            </List.Item>
          )}
        />
      ) : (
        !loading && (
          <Paragraph style={{ textAlign: "center", marginTop: 24, color: "#777" }}>
            Aucune suggestion pour le moment.
          </Paragraph>
        )
      )}
    </Card>
  );
}
