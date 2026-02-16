// src/pages/Auth/Login.jsx
import { useState, useContext } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../../services/authService";
import { AuthContext } from "../../context/AuthContext";

const { Title } = Typography;

export default function Login() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [deviceId] = useState(uuidv4());

  /**
   * Soumission du formulaire
   */
  const onFinish = async ({ username, password }) => {
    setLoading(true);
    // Nettoyer l'état d'erreur éventuel du champ password
    form.setFields([{ name: "password", errors: [] }]);

    try {
      const { accessToken, role } = await loginService({ username, password, deviceId });

      if (!accessToken || !role) {
        throw new Error("Réponse de connexion invalide");
      }

      // Mémorise l'authentification dans le contexte
      login(accessToken, { username, role });
      message.success("Connexion réussie ! Bienvenue ✨", 2);
      navigate("/home/profile");
    } catch (err) {
      if (err.response?.status === 401) {
        // Affiche l'erreur directement sous le champ mot de passe
        form.setFields([{ name: "password", errors: ["Nom d’utilisateur ou mot de passe incorrect"] }]);
      } else {
        const msg = err.response?.data?.message || "Échec de la connexion. Vérifiez vos identifiants.";
        message.error(msg, 3);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 360 }} bordered={false} bodyStyle={{ padding: "32px 24px" }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
          Se connecter
        </Title>

        <Form
          form={form}
          name="login"
          initialValues={{ username: "", password: "" }}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="Nom d'utilisateur"
            rules={[{ required: true, message: "Veuillez entrer votre nom d'utilisateur" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Votre identifiant" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mot de passe"
            rules={[{ required: true, message: "Veuillez entrer votre mot de passe" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
          </Form.Item>

          <Form.Item noStyle shouldUpdate>
            {() => (
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                disabled={loading || !form.isFieldsTouched(true) || form.getFieldsError().some(({ errors }) => errors.length)}
              >
                Se connecter
              </Button>
            )}
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}