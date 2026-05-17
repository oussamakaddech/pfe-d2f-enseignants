import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Typography, Card, Result } from "antd";
import { MailOutlined, ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import useAppNotification from "../../hooks/useAppNotification";
import { forgotPassword } from "../../services/authService";
import { brand, neutral, radius, shadow } from "../../theme/tokens";

const { Title, Text } = Typography;

function PasswordRecovery() {
  const { message } = useAppNotification();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (values: { email: string }) => {
    setSubmitting(true);
    setEmail(values.email);
    try {
      const response = await forgotPassword(values.email);
      message.success(String(response || "Email de réinitialisation envoyé"));
      setSent(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de l'envoi";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: neutral[50] }}>
        <Card style={{ width: 460, borderRadius: radius.lg, boxShadow: shadow.md }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a" }} />}
            title={<Title level={3}>Email envoyé !</Title>}
            subTitle={`Un lien de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception.`}
            extra={[
              <Button type="primary" key="login" size="large" onClick={() => navigate("/login")}>
                Retour à la connexion
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: neutral[50] }}>
      <Card style={{ width: 460, borderRadius: radius.lg, boxShadow: shadow.md }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/login")}
          style={{ padding: 0, marginBottom: 16, color: brand[500] }}
        >
          Retour à la connexion
        </Button>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: radius.lg,
            background: `${brand[500]}12`, color: brand[500],
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 16px",
          }}>
            <MailOutlined />
          </div>
          <Title level={3} style={{ margin: "0 0 8px" }}>Récupération mot de passe</Title>
          <Text type="secondary">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </Text>
        </div>
        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Email valide requis" }]}>
            <Input prefix={<MailOutlined />} placeholder="vous@exemple.fr" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large">
              {submitting ? "Envoi…" : "Réinitialiser le mot de passe"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default PasswordRecovery;
