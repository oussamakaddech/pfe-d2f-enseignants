import { Form, Input, Checkbox, Button, Typography, Progress } from "antd";
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useRegister, type RegisterFormValues } from "@/hooks/auth/useRegister";
import "@/styles/pages/register.css";

const { Title } = Typography;

const confirmValidator = (field: string, msg: string) =>
  ({ getFieldValue }: { getFieldValue: (name: string) => string }) => ({
    validator(_: unknown, value: string) {
      if (!value || getFieldValue(field) === value) return Promise.resolve();
      return Promise.reject(new Error(msg));
    },
  });

type StrengthStatus = "success" | "exception" | "normal" | "active";

/** Indicateur de robustesse du mot de passe (audit DSI). */
function getPasswordStrength(pwd: string | undefined): { percent: number; label: string; status: StrengthStatus } {
  if (!pwd) return { percent: 0, label: "", status: "normal" };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  const percent = (score / 5) * 100;
  if (score <= 2) return { percent, label: "Faible", status: "exception" };
  if (score <= 3) return { percent, label: "Moyen", status: "active" };
  if (score <= 4) return { percent, label: "Bon", status: "normal" };
  return { percent, label: "Fort", status: "success" };
}

interface RegisterProps {
  onSuccess?: () => void;
}

export default function Register({ onSuccess }: RegisterProps = {}) {
  const [form] = Form.useForm<RegisterFormValues>();
  const navigate = useNavigate();
  const { loading, register } = useRegister();
  const passwordValue = Form.useWatch("password", form);
  const strength = getPasswordStrength(passwordValue);

  const onFinish = async (values: RegisterFormValues) => {
    const ok = await register(values);
    if (!ok) return;
    form.resetFields();
    if (onSuccess) {
      onSuccess();
    } else {
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div className="register-page">
      <div className="register-brand">
        <div className="register-brand-inner">
          <img src="/assets/img/logo/esprit.png" alt="ESPRIT" className="register-brand-logo" />
          <div className="register-brand-title">ESPRIT</div>
          <div className="register-brand-divider" />
          <p className="register-brand-sub">Direction de la Formation<br />Création de compte</p>
        </div>
      </div>

      <div className="register-form-panel">
        <div className="register-card">
          <Title level={2} className="register-card-title">Création de compte</Title>
          <p className="register-card-subtitle">Remplissez le formulaire pour créer votre compte D2F</p>

          <Form form={form} layout="vertical" onFinish={onFinish} scrollToFirstError className="register-form">

            <Form.Item name="username" label="Nom d'utilisateur" help="Choisissez un identifiant unique pour vous connecter"
              rules={[{ required: true, message: "Entrez un nom d'utilisateur" }, { min: 3, max: 20, message: "Entre 3 et 20 caractères" }]}>
              <Input prefix={<UserOutlined />} placeholder="Votre username" />
            </Form.Item>

            <Form.Item name="password" label="Mot de passe" help="Au moins 8 caractères, une lettre et un chiffre"
              rules={[
                { required: true, message: "Entrez un mot de passe" },
                { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, message: "Au moins 8 caractères, une lettre et un chiffre" },
              ]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
            {passwordValue ? (
              <div className="register-pwd-strength" style={{ marginTop: -12, marginBottom: 16 }}>
                <Progress percent={strength.percent} status={strength.status} showInfo={false} size="small" />
                <span style={{ fontSize: 12, color: "#888" }}>Robustesse : {strength.label}</span>
              </div>
            ) : null}

            <Form.Item name="confirmPassword" label="Confirmer le mot de passe" help="Doit correspondre au mot de passe saisi ci-dessus"
              dependencies={["password"]}
              rules={[{ required: true, message: "Confirmez le mot de passe" }, confirmValidator("password", "Les mots de passe ne correspondent pas")]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item name="firstName" label="Prénom" rules={[{ required: true, message: "Entrez votre prénom" }]}>
              <Input placeholder="Prénom" />
            </Form.Item>

            <Form.Item name="lastName" label="Nom de famille" rules={[{ required: true, message: "Entrez votre nom de famille" }]}>
              <Input placeholder="Nom de famille" />
            </Form.Item>

            <Form.Item name="phoneNumber" label="Téléphone" help="Format : 06XXXXXXXX ou 07XXXXXXXX"
              rules={[{ required: true, message: "Entrez votre numéro de téléphone" }]}>
              <Input prefix={<PhoneOutlined />} placeholder="Ex : 0612345678" />
            </Form.Item>

            <Form.Item name="email" label="Adresse email" help="Utilisée pour confirmer votre compte"
              rules={[{ required: true, message: "Entrez une adresse email" }, { type: "email", message: "Email invalide" }]}>
              <Input prefix={<MailOutlined />} placeholder="exemple@mail.com" />
            </Form.Item>

            <Form.Item name="confirmEmail" label="Confirmer email" help="Doit correspondre à l'email saisi ci-dessus"
              dependencies={["email"]}
              rules={[{ required: true, message: "Confirmez votre email" }, confirmValidator("email", "Les emails ne correspondent pas")]}>
              <Input prefix={<MailOutlined />} placeholder="exemple@mail.com" />
            </Form.Item>

            <Form.Item name="newsletter" valuePropName="checked" help="Recevez nos dernières actualités par email">
              <Checkbox>S'abonner à la newsletter</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="register-button" style={{ width: "100%" }}>
                S'inscrire
              </Button>
            </Form.Item>

            <Form.Item style={{ textAlign: "center" }}>
              <Button type="link" className="register-link-btn" onClick={() => navigate("/")}>
                Déjà un compte ? Se connecter
              </Button>
            </Form.Item>

          </Form>
        </div>
      </div>
    </div>
  );
}
