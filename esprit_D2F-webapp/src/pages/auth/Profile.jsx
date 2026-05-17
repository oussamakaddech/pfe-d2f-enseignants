// src/pages/GererComptes/Profile.jsx
import { useEffect, useState } from "react";
import {
  Card,
  Avatar,
  Button,
  Spin,
  Drawer,
  Form,
  Input,
  Checkbox,
  Alert,
  Typography,
  Space,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  TeamOutlined,
  PhoneOutlined,
  EditOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  getProfile,
  editProfile,
  updatePassword,
} from "../../services/accountService";
import useAppNotification from "../../hooks/useAppNotification";
import "./Profile.css";

const { Title, Text } = Typography;

export default function Profile() {
  const { message: msgApi } = useAppNotification();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isPwdDrawerOpen, setIsPwdDrawerOpen] = useState(false);
  const [error, setError] = useState(null);

  const [infoForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProfile();
      setProfile(data);
      infoForm.setFieldsValue({
        email: data.email,
        phoneNumber: data.phoneNumber,
        firstName: data.firstName || data.firsName,
        lastName: data.lastName,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Impossible de charger le profil.";
      setError(errorMsg);
      msgApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishInfo = async (values) => {
    setSaving(true);
    try {
      await editProfile(values);
      msgApi.success("Profil mis à jour !");
      setIsInfoDrawerOpen(false);
      await loadProfile();
    } catch (err) {
      msgApi.error(err.response?.data?.message || err.message || "Erreur de modification");
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
      msgApi.error(err.response?.data?.message || err.message || "Erreur");
    } finally {
      setPasswordSaving(false);
    }
  };

  const initial = profile
    ? (profile.firstName || profile.firsName || profile.userName || "U")[0].toUpperCase()
    : "U";

  return (
    <div className="profile-container">
      {loading ? (
        <div style={{ textAlign: "center", paddingTop: 100 }}>
          <Spin size="large" tip="Chargement de votre univers..."><div /></Spin>
        </div>
      ) : error ? (
        <Card className="profile-main-card">
          <Alert
            message="Oups !"
            description={error}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={<Button size="small" onClick={loadProfile}>Réessayer</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="profile-main-card" variant="borderless">
            {/* Avatar Section */}
            <div className="profile-avatar-wrapper">
              <Avatar className="profile-avatar" size={120}>
                {initial}
              </Avatar>
            </div>

            {/* Title Section */}
            <div className="profile-title-section">
              <Title level={2} className="profile-name">
                {profile?.firstName || profile?.firsName} {profile?.lastName}
              </Title>
              <div className="profile-role-tag">
                <TeamOutlined /> {profile?.role || "Utilisateur"}
              </div>
            </div>

            {/* Info Grid */}
            <div className="profile-info-grid">
              <div className="info-item">
                <div className="info-label"><UserOutlined /> Identifiant</div>
                <div className="info-value">{profile?.userName || "-"}</div>
              </div>
              <div className="info-item">
                <div className="info-label"><MailOutlined /> Adresse E-mail</div>
                <div className="info-value">{profile?.email || "-"}</div>
              </div>
              <div className="info-item">
                <div className="info-label"><PhoneOutlined /> Téléphone</div>
                <div className="info-value">{profile?.phoneNumber || "-"}</div>
              </div>
              <div className="info-item">
                <div className="info-label"><BellOutlined /> Newsletter</div>
                <div className="info-value">
                  <Checkbox checked={profile?.newsletter} disabled>Abonné aux actus</Checkbox>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="profile-actions">
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsInfoDrawerOpen(true)}
                size="large"
              >
                Modifier le profil
              </Button>
              <Button
                icon={<LockOutlined />}
                onClick={() => setIsPwdDrawerOpen(true)}
                size="large"
              >
                Changer le mot de passe
              </Button>
            </div>
          </Card>

          {/* Edit Info Drawer */}
          <Drawer
            title="Modifier mes informations"
            width={480}
            onClose={() => setIsInfoDrawerOpen(false)}
            open={isInfoDrawerOpen}
            styles={{ body: { paddingBottom: 80 } }}
          >
            <Form form={infoForm} layout="vertical" onFinish={onFinishInfo}>
               <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Form.Item name="firstName" label="Prénom" rules={[{ required: true }]}>
                  <Input placeholder="Votre prénom" />
                </Form.Item>
                <Form.Item name="lastName" label="Nom" rules={[{ required: true }]}>
                  <Input placeholder="Votre nom" />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                  <Input prefix={<MailOutlined />} />
                </Form.Item>
                <Form.Item name="phoneNumber" label="Téléphone">
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
                <div style={{ textAlign: 'right' }}>
                  <Button onClick={() => setIsInfoDrawerOpen(false)} style={{ marginRight: 8 }}>Annuler</Button>
                  <Button type="primary" htmlType="submit" loading={saving}>Enregistrer</Button>
                </div>
              </Space>
            </Form>
          </Drawer>

          {/* Password Drawer */}
          <Drawer
            title="Changer le mot de passe"
            width={480}
            onClose={() => setIsPwdDrawerOpen(false)}
            open={isPwdDrawerOpen}
          >
            <Form form={pwdForm} layout="vertical" onFinish={onFinishPwd}>
              <Form.Item name="newPassword" label="Nouveau mot de passe" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item name="confirmation" label="Confirmer" dependencies={['newPassword']} 
                rules={[{ required: true }, ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                  }
                })]}>
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Button type="primary" block htmlType="submit" loading={passwordSaving}>Mettre à jour</Button>
            </Form>
          </Drawer>
        </>
      )}
    </div>
  );
}
