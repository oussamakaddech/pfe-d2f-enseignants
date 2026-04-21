// src/pages/GererComptes/Profile.jsx
import { useEffect, useState } from "react";
import {
  Card,
  Avatar,
  Descriptions,
  Button,
  Spin,
  message,
  Drawer,
  Form,
  Input,
  Checkbox,
  Alert,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  TeamOutlined,
  PhoneOutlined,
  EditOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  getProfile,
  editProfile,
  updatePassword,
} from "../../services/accountService";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [msgApi, contextHolder] = message.useMessage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isPwdDrawerOpen, setIsPwdDrawerOpen] = useState(false);
  const [error, setError] = useState(null);

  const [infoForm] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Chargement du profil...");

      const data = await getProfile();
      console.log("✅ Profil chargé:", data);

      setProfile(data);
      infoForm.setFieldsValue({
        email: data.email,
        phoneNumber: data.phoneNumber,
        firstName: data.firstName || data.firsName,
        lastName: data.lastName,
      });
    } catch (err) {
      console.error("❌ Erreur chargement profil:", err);
      const errorMsg =
        err.response?.data?.message || err.message || "Impossible de charger le profil.";
      setError(errorMsg);
      msgApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishInfo = async (values) => {
    setSaving(true);
    try {
      const payload = {
        email: values.email,
        phoneNumber: values.phoneNumber,
        firstName: values.firstName,
        lastName: values.lastName,
      };
      console.log("📤 Modification profil:", payload);
      await editProfile(payload);
      msgApi.success("Profil mis à jour !");
      setIsInfoDrawerOpen(false);
      await loadProfile();
    } catch (err) {
      console.error("❌ Erreur modification:", err);
      const backendMsg =
        err.response?.data?.message || err.message || "Erreur lors de la modification";
      msgApi.error(backendMsg);
    } finally {
      setSaving(false);
    }
  };

  const onFinishPwd = async ({ newPassword, confirmation }) => {
    if (newPassword !== confirmation) {
      msgApi.warning("Les mots de passe ne correspondent pas");
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword({ newPassword, confirmation });
      msgApi.success("Mot de passe changé !");
      setIsPwdDrawerOpen(false);
      pwdForm.resetFields();
    } catch (err) {
      console.error("❌ Erreur changement mot de passe:", err);
      const backendMsg =
        err.response?.data?.message ||
        err.message ||
        "Erreur lors du changement de mot de passe";
      msgApi.error(backendMsg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const initial = profile
    ? (
        profile.firstName ||
        profile.firsName ||
        profile.userName ||
        "U"
      )[0].toUpperCase()
    : "U";

  return (
    <>
      {contextHolder}
      {loading ? (
        <Spin size="large" style={{ display: "block", marginTop: 100 }} />
      ) : error ? (
        <Card style={{ maxWidth: 800, margin: "24px auto" }}>
          <Alert
            message="Erreur"
            description={error}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Button size="small" onClick={loadProfile}>
                Réessayer
              </Button>
            }
          />
        </Card>
      ) : !profile ? (
        <Card style={{ maxWidth: 800, margin: "24px auto" }}>
          <Alert
            message="Aucune donnée"
            description="Impossible de charger les données du profil"
            type="warning"
            showIcon
          />
        </Card>
      ) : (
        <>
          <Card style={{ maxWidth: 800, margin: "24px auto" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ marginRight: 8 }}
              >
                Retour
              </Button>
              <h2 style={{ margin: 0 }}>Mon Profil</h2>
            </div>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Avatar size={100} style={{ backgroundColor: "#f56a00" }}>
                {initial}
              </Avatar>
            </div>

            <Descriptions column={1} bordered>
              <Descriptions.Item label={<><UserOutlined /> Username</>}>
                {profile.userName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={<><MailOutlined /> Email</>}>
                {profile.email || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> Prénom</>}>
                {profile.firstName || profile.firsName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={<><UserOutlined /> Nom</>}>
                {profile.lastName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Téléphone</>}>
                {profile.phoneNumber || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={<><TeamOutlined /> Rôle</>}>
                {profile.role || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Newsletter">
                <Checkbox checked={profile.newsletter || false} disabled>
                  Abonné
                </Checkbox>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Button
                icon={<EditOutlined />}
                type="primary"
                onClick={() => setIsInfoDrawerOpen(true)}
                style={{ marginRight: 8 }}
              >
                Modifier profil
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => setIsPwdDrawerOpen(true)}
              >
                Changer mot de passe
              </Button>
            </div>
          </Card>

          <Drawer
            title="Modifier mon profil"
            width={480}
            onClose={() => setIsInfoDrawerOpen(false)}
            open={isInfoDrawerOpen}
            styles={{ body: { paddingBottom: 80 } }}
          >
            <Form form={infoForm} layout="vertical" onFinish={onFinishInfo}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Entrez votre adresse email" },
                  { type: "email", message: "Format d'email invalide" },
                ]}
              >
                <Input prefix={<MailOutlined />} />
              </Form.Item>

              <Form.Item
                name="phoneNumber"
                label="Téléphone"
                rules={[{ required: true, message: "Entrez votre numéro" }]}
              >
                <Input prefix={<PhoneOutlined />} />
              </Form.Item>

              <Form.Item
                name="firstName"
                label="Prénom"
                rules={[{ required: true, message: "Entrez votre prénom" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="lastName"
                label="Nom"
                rules={[{ required: true, message: "Entrez votre nom" }]}
              >
                <Input />
              </Form.Item>

              <Form.Item>
                <Button
                  onClick={() => setIsInfoDrawerOpen(false)}
                  style={{ marginRight: 8 }}
                >
                  Annuler
                </Button>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Enregistrer
                </Button>
              </Form.Item>
            </Form>
          </Drawer>

          <Drawer
            title="Changer mon mot de passe"
            width={480}
            onClose={() => setIsPwdDrawerOpen(false)}
            open={isPwdDrawerOpen}
            styles={{ body: { paddingBottom: 80 } }}
          >
            <Form form={pwdForm} layout="vertical" onFinish={onFinishPwd}>
              <Form.Item
                name="newPassword"
                label="Nouveau mot de passe"
                rules={[
                  { required: true, message: "Entrez un nouveau mot de passe" },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="confirmation"
                label="Confirmer mot de passe"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Confirmez le mot de passe" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Les mots de passe ne correspondent pas")
                      );
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item>
                <Button
                  onClick={() => setIsPwdDrawerOpen(false)}
                  style={{ marginRight: 8 }}
                >
                  Annuler
                </Button>
                <Button type="primary" htmlType="submit" loading={passwordSaving}>
                  Mettre à jour
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
        </>
      )}
    </>
  );
}
