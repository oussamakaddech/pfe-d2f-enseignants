// src/Pages/Auth/Register.jsx
import { useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Typography,
  message,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { signup } from "../../services/authService.js";

const { Title } = Typography;
const { Option } = Select;

export default function Register() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await signup({
        username: values.username,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber,
        email: values.email,
        role: values.role,
        newsletter: values.newsletter,
      });
      message.success(
        "Inscription réussie ! Un email de confirmation vous a été envoyé."
      );
      // Redirection vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      message.error(
        err.response?.data?.message ||
          "Une erreur est survenue pendant l'inscription."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{ maxWidth: 600, margin: "40px auto", padding: "24px" }}
      bordered={false}
    >
      <Title level={2} style={{ textAlign: "center", marginBottom: 24 }}>
        Création de compte
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        scrollToFirstError
      >
        <Form.Item
          name="username"
          label={
            <>
              Nom d'utilisateur <InfoCircleOutlined />
            </>
          }
          help="Choisissez un identifiant unique pour vous connecter"
          rules={[{ required: true, message: "Entrez un nom d'utilisateur" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Votre username" />
        </Form.Item>

        <Form.Item
          name="password"
          label={
            <>
              Mot de passe <InfoCircleOutlined />
            </>
          }
          help="Au moins 8 caractères, une majuscule et un chiffre"
          rules={[{ required: true, message: "Entrez un mot de passe" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={
            <>
              Confirmer le mot de passe <InfoCircleOutlined />
            </>
          }
          help="Doit correspondre au mot de passe saisi ci-dessus"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Confirmez le mot de passe" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Les mots de passe ne correspondent pas")
                );
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
        </Form.Item>

        <Form.Item
          name="firstName"
          label={
            <>
              Prénom <InfoCircleOutlined />
            </>
          }
          help="Entrez votre prénom tel qu'il apparaît sur vos documents"
          rules={[{ required: true, message: "Entrez votre prénom" }]}
        >
          <Input placeholder="Prénom" />
        </Form.Item>

        <Form.Item
          name="lastName"
          label={
            <>
              Nom de famille <InfoCircleOutlined />
            </>
          }
          help="Entrez votre nom de famille"
          rules={[{ required: true, message: "Entrez votre nom de famille" }]}
        >
          <Input placeholder="Nom de famille" />
        </Form.Item>

        <Form.Item
          name="phoneNumber"
          label={
            <>
              Téléphone <InfoCircleOutlined />
            </>
          }
          help="Format : 06XXXXXXXX ou 07XXXXXXXX"
          rules={[{ required: true, message: "Entrez votre numéro de téléphone" }]}
        >
          <Input prefix={<PhoneOutlined />} placeholder="Ex : 0612345678" />
        </Form.Item>

        <Form.Item
          name="email"
          label={
            <>
              Adresse email <InfoCircleOutlined />
            </>
          }
          help="Utilisée pour confirmer votre compte"
          rules={[
            { required: true, message: "Entrez une adresse email" },
            { type: "email", message: "Email invalide" },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="exemple@mail.com" />
        </Form.Item>

        <Form.Item
          name="confirmEmail"
          label={
            <>
              Confirmer email <InfoCircleOutlined />
            </>
          }
          help="Doit correspondre à l'email saisi ci-dessus"
          dependencies={["email"]}
          rules={[
            { required: true, message: "Confirmez votre email" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("email") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Les emails ne correspondent pas")
                );
              },
            }),
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="exemple@mail.com" />
        </Form.Item>

        <Form.Item
          name="role"
          label={
            <>
              Rôle <InfoCircleOutlined />
            </>
          }
          help="Sélectionnez votre rôle dans l'application"
          rules={[{ required: true, message: "Sélectionnez un rôle" }]}
          initialValue="Formateur"
        >
          <Select>
            <Option value="admin">Admin</Option>
            <Option value="D2F">D2F</Option>
            <Option value="CUP">CUP</Option>
            <Option value="Formateur">Formateur</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="newsletter"
          valuePropName="checked"
          help="Recevez nos dernières actualités par email"
        >
          <Checkbox>S'abonner à la newsletter</Checkbox>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ width: "100%" }}
          >
            S'inscrire
          </Button>
        </Form.Item>

        <Form.Item style={{ textAlign: "center" }}>
          <Button type="link" onClick={() => navigate("/")}>
            Déjà un compte ? Se connecter
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}