// src/pages/Auth/Login.jsx
import { useState, useContext, useEffect } from "react";
import { App, Form, Input, Button, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { login as loginService } from "../../services/authService";
import { AuthContext } from "../../context/AuthContext";
import "./Login.css";

const { Title } = Typography;

export default function Login() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [deviceId] = useState(uuidv4());
  const [particles, setParticles] = useState([]);

  // Création des particules de fond
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      const type = i % 3 === 0 ? 'square' : i % 3 === 1 ? 'triangle' : '';
      newParticles.push({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 10 + 5,
        delay: Math.random() * 15,
        duration: Math.random() * 10 + 15,
        type,
      });
    }
    setParticles(newParticles);
  }, []);

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
    <div className="login-container">
      {/* Icônes éducatives flottantes */}
      <div className="edu-icon">📚</div>
      <div className="edu-icon">🎓</div>
      <div className="edu-icon">📖</div>
      <div className="edu-icon">✏️</div>

      {/* Particules de fond */}
      <div className="particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`particle ${particle.type}`}
            style={{
              left: `${particle.left}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Carte de connexion */}
      <div className="login-card">
        {/* En-tête avec logo et nom */}
        <div className="login-header">
          <div className="login-logo-container">
            <img
              src="/assets/img/logo/esprit.png"
              alt="Esprit Logo"
              className="login-logo"
            />
          </div>
          <Title level={2} className="login-title">
            ESPRIT
          </Title>
          <p className="login-subtitle">Plateforme de Formation Continue</p>
        </div>

        <Form
          form={form}
          name="login"
          initialValues={{ username: "", password: "" }}
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
          className="login-form"
        >
          <Form.Item
            name="username"
            label="Nom d'utilisateur"
            rules={[{ required: true, message: "Veuillez entrer votre nom d'utilisateur" }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="Votre identifiant" 
              size="large" 
              className="login-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mot de passe"
            rules={[{ required: true, message: "Veuillez entrer votre mot de passe" }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="••••••••" 
              size="large" 
              className="login-input"
            />
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
                className="login-button"
              >
                Se connecter
              </Button>
            )}
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}