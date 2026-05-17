// src/pages/auth/Register.jsx
import { useState } from "react";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Button,
  Typography,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import useAppNotification from "../../hooks/useAppNotification";
import { useNavigate } from "react-router-dom";
import { signup } from "../../services/authService";
import EnseignantService from "../../services/EnseignantService";
import "./Register.css";

const { Title } = Typography;
const { Option } = Select;

export default function Register({ onSuccess } = {}) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 1. Création du compte utilisateur (Auth)
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

      // 2. Si le rôle est Enseignant, Formateur ou CUP, on l'ajoute à l'annuaire des enseignants
      // 2. Si le rôle est Enseignant, Formateur, CUP ou Chef Département, on l'ajoute à l'annuaire des enseignants
      if (values.role === "Enseignant" || values.role === "Formateur" || values.role === "CUP" || values.role === "CHEF_DEPARTEMENT") {
        try {
          await EnseignantService.createEnseignant({
            nom: values.lastName.toUpperCase(),
            prenom: values.firstName,
            mail: values.email,
            type: "P", // Valeur par défaut : Permanent
            etat: "A", // Valeur par défaut : Actif
            cup: values.role === "CUP" ? "O" : "N",
            chefDepartement: values.role === "CHEF_DEPARTEMENT" ? "O" : "N",
            up: null,
            dept: null,
          });
          console.debug("[Register] Enseignant record created successfully");
        } catch (ensErr) {
          console.error("[Register] Failed to create teacher record:", ensErr);
          // On ne bloque pas l'inscription si seul l'ajout à l'annuaire échoue
          message.warning("Compte créé, mais l'ajout à l'annuaire des enseignants a échoué.");
        }
      }

      message.success(
        "Inscription réussie ! Un email de confirmation vous a été envoyé."
      );
      form.resetFields();
      // Si utilisé dans le Drawer de gestion des comptes, callback onSuccess
      if (onSuccess) {
        onSuccess();
      } else {
        // Sinon, redirection vers la page de connexion après 2 secondes
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
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
    <div className="register-page">
      <div className="register-brand">
        <div className="register-brand-inner">
          <img
            src="/assets/img/logo/esprit.png"
            alt="ESPRIT"
            className="register-brand-logo"
          />
          <div className="register-brand-title">ESPRIT</div>
          <div className="register-brand-divider" />
          <p className="register-brand-sub">
            Direction de la Formation<br />Création de compte
          </p>
        </div>
      </div>

      <div className="register-form-panel">
        <div className="register-card">
          <Title level={2} className="register-card-title">
            Création de compte
          </Title>
          <p className="register-card-subtitle">
            Remplissez le formulaire pour créer votre compte D2F
          </p>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            scrollToFirstError
            className="register-form"
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
            <Option value="CUP">CUP</Option>
            <Option value="Enseignant">Enseignant</Option>
            <Option value="Formateur">Formateur</Option>
            <Option value="CHEF_DEPARTEMENT">Chef Département</Option>
            <Option value="RESPONSABLE_DOSSIER">Responsable Dossier</Option>
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
            className="register-button"
            style={{ width: "100%" }}
          >
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