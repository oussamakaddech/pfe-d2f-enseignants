import { useState } from "react";
import { Form, Input, Button, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/auth/useAuthService";
import { useAuth } from "@/hooks/auth/useAuth";
import type { LoginResponse, UserRole } from "@/models/auth";
import "@/styles/pages/login.css";

const { Title } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
}

const FEATURES = [
  "Gestion des formations continues",
  "Suivi des compétences et évaluations",
  "Analyse prédictive par intelligence artificielle",
];

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 8 + (i % 4) * 7,
  left: `${(i * 7.3) % 95}%`,
  dur: `${16 + (i % 5) * 4}s`,
  delay: `${(i * 1.9) % 12}s`,
}));

export default function Login() {
  const { message } = useAppNotification();
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutateAsync: loginApi } = useLogin();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    const { username, password } = values;
    setLoading(true);
    form.setFields([{ name: "password", errors: [] }]);
    try {
      const data: LoginResponse = await loginApi({ username, password });
      if (!data.role) throw new Error("Réponse de connexion invalide");
      login({
        userId: data.userId,
        username,
        role: data.role as UserRole,
        email: data.email,
        expiresIn: data.expiresIn
      });
      message.success("Connexion réussie !", 2);
      navigate("/home/profile");
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 401) {
        form.setFields([{ name: "password", errors: ["Nom d'utilisateur ou mot de passe incorrect"] }]);
      } else {
        message.error(axiosError.response?.data?.message || "Échec de la connexion.", 3);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ── Left: Branding Panel ── */}
      <div className="login-brand">
        <div className="login-particles" aria-hidden="true">
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="login-particle"
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                "--dur": p.dur,
                "--delay": p.delay,
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="login-brand-inner">
          <img
            src="/assets/img/logo/esprit.png"
            alt="Esprit"
            className="login-brand-logo"
          />
          <h1 className="login-brand-title">ESPRIT</h1>
          <div className="login-brand-divider" />
          <p className="login-brand-sub">
            Plateforme de Développement<br />des Formateurs — D2F
          </p>
          <div className="login-brand-features">
            {FEATURES.map((f) => (
              <div key={f} className="login-brand-feature">
                <span className="login-brand-feature-dot" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="login-form-panel">
        <div className="login-card">
          <Title level={3} className="login-card-title">Connexion</Title>
          <p className="login-card-subtitle">
            Entrez vos identifiants pour accéder à la plateforme
          </p>

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
              rules={[{ required: true, message: "Champ requis" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#bbb" }} />}
                placeholder="Votre identifiant"
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mot de passe"
              rules={[{ required: true, message: "Champ requis" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bbb" }} />}
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
                  disabled={
                    loading ||
                    !form.isFieldsTouched(true) ||
                    form.getFieldsError().some(({ errors }) => errors.length)
                  }
                  className="login-button"
                >
                  Se connecter
                </Button>
              )}
            </Form.Item>
          </Form>

          <p className="login-footer">© 2025 ESPRIT — Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
}




