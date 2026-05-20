import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Typography, Card, Row, Col } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { forgotPassword } from "@/services/auth/AuthService";

const { Title, Text } = Typography;

function PasswordRecovery() {
  const { message } = useAppNotification();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const response = await forgotPassword(values.email);
      message.success(response || "Email de réinitialisation envoyé");
    } catch (err) {
      const msg = err?.response?.data?.message || "Erreur lors de l'envoi";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
      <Card style={{ width: 420, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate("/")} style={{ padding: 0, marginBottom: 16 }}>
          Retour
        </Button>
        <Title level={3} style={{ textAlign: "center" }}>Récupération mot de passe</Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 24 }}>
          Saisissez votre email pour recevoir un lien de réinitialisation
        </Text>
        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email valide requis" }]}>
            <Input prefix={<MailOutlined />} placeholder="vous@exemple.fr" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" danger htmlType="submit" loading={submitting} block size="large">
              {submitting ? "Envoi…" : "Réinitialiser le mot de passe"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default PasswordRecovery;




