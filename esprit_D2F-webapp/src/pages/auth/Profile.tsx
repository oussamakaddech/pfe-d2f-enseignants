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
  Row,
  Col,
  Divider,
  Tag,
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
  IdcardOutlined,
} from "@ant-design/icons";
import {
  getProfile,
  editProfile,
  updatePassword,
} from "../../services/accountService";
import useAppNotification from "../../hooks/useAppNotification";
import { D2FPageHeader, D2FSection } from "../../components/ui";
import { brand, neutral, radius, shadow } from "../../theme/tokens";
import "./Profile.css";

const { Title, Text } = Typography;

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin: { color: "#7c3aed", bg: "#f5f3ff" },
  CUP: { color: brand[500], bg: brand[50] },
  ENSEIGNANT: { color: "#2563eb", bg: "#eff6ff" },
  FORMATEUR: { color: "#d97706", bg: "#fffbeb" },
  CHEF_DEPARTEMENT: { color: "#0891b2", bg: "#ecfeff" },
};

export default function Profile() {
  const { message: msgApi } = useAppNotification();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [isPwdDrawerOpen, setIsPwdDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Impossible de charger le profil.";
      setError(errorMsg);
      msgApi.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinishInfo = async (values: any) => {
    setSaving(true);
    try {
      await editProfile(values);
      msgApi.success("Profil mis à jour !");
      setIsInfoDrawerOpen(false);
      await loadProfile();
    } catch (err: any) {
      msgApi.error(err.response?.data?.message || err.message || "Erreur de modification");
    } finally {
      setSaving(false);
    }
  };

  const onFinishPwd = async ({ newPassword, confirmation }: { newPassword: string; confirmation: string }) => {
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
    } catch (err: any) {
      msgApi.error(err.response?.data?.message || err.message || "Erreur");
    } finally {
      setPasswordSaving(false);
    }
  };

  const initial = profile
    ? (profile.firstName || profile.firsName || profile.userName || "U")[0].toUpperCase()
    : "U";

  const roleKey = profile?.role || "";
  const roleStyle = ROLE_COLORS[roleKey] || ROLE_COLORS["ENSEIGNANT"];

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <Spin size="large" tip="Chargement de votre profil..." />
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ borderRadius: radius.lg, boxShadow: shadow.sm }}>
        <Alert
          message="Oups !"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={<Button size="small" onClick={loadProfile}>Réessayer</Button>}
        />
      </Card>
    );
  }

  return (
    <>
      <D2FPageHeader
        icon={<UserOutlined />}
        title="Mon Profil"
        subtitle="Consultez et modifiez vos informations personnelles"
        actions={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setIsInfoDrawerOpen(true)}>
              Modifier
            </Button>
            <Button icon={<LockOutlined />} onClick={() => setIsPwdDrawerOpen(true)}>
              Mot de passe
            </Button>
          </Space>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card
            variant="borderless"
            style={{ borderRadius: radius.lg, boxShadow: shadow.sm, textAlign: "center", padding: "32px 24px" }}
          >
            <Avatar
              size={100}
              style={{
                background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
                color: "#fff",
                fontSize: 40,
                fontWeight: 700,
                marginBottom: 16,
                border: "3px solid #fff",
                boxShadow: "0 4px 12px rgba(181,18,0,0.2)",
              }}
            >
              {initial}
            </Avatar>
            <Title level={4} style={{ margin: "0 0 4px", fontWeight: 700 }}>
              {profile?.firstName || profile?.firsName} {profile?.lastName}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
              @{profile?.userName}
            </Text>
            <Tag
              icon={<TeamOutlined />}
              color={roleStyle.color}
              style={{
                borderRadius: 9999,
                border: "none",
                background: roleStyle.bg,
                fontWeight: 600,
                padding: "4px 16px",
              }}
            >
              {roleKey}
            </Tag>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <D2FSection
            title="Informations personnelles"
            icon={<IdcardOutlined />}
          >
            <Row gutter={[24, 20]}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                    <UserOutlined style={{ marginRight: 6 }} /> Identifiant
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>{profile?.userName || "—"}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                    <MailOutlined style={{ marginRight: 6 }} /> Email
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>{profile?.email || "—"}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                    <PhoneOutlined style={{ marginRight: 6 }} /> Téléphone
                  </Text>
                </div>
                <Text strong style={{ fontSize: 15 }}>{profile?.phoneNumber || "—"}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                    <BellOutlined style={{ marginRight: 6 }} /> Newsletter
                  </Text>
                </div>
                <Checkbox checked={profile?.newsletter} disabled>
                  {profile?.newsletter ? "Abonné aux actualités" : "Non abonné"}
                </Checkbox>
              </Col>
            </Row>
          </D2FSection>
        </Col>
      </Row>

      <Drawer
        title="Modifier mes informations"
        width={480}
        onClose={() => setIsInfoDrawerOpen(false)}
        open={isInfoDrawerOpen}
        styles={{ body: { paddingBottom: 80 } }}
      >
        <Form form={infoForm} layout="vertical" onFinish={onFinishInfo}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Form.Item name="firstName" label="Prénom" rules={[{ required: true }]}>
              <Input placeholder="Votre prénom" size="large" />
            </Form.Item>
            <Form.Item name="lastName" label="Nom" rules={[{ required: true }]}>
              <Input placeholder="Votre nom" size="large" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
              <Input prefix={<MailOutlined />} size="large" />
            </Form.Item>
            <Form.Item name="phoneNumber" label="Téléphone">
              <Input prefix={<PhoneOutlined />} size="large" />
            </Form.Item>
            <div style={{ textAlign: "right" }}>
              <Button onClick={() => setIsInfoDrawerOpen(false)} style={{ marginRight: 8 }}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Enregistrer</Button>
            </div>
          </Space>
        </Form>
      </Drawer>

      <Drawer
        title="Changer le mot de passe"
        width={480}
        onClose={() => setIsPwdDrawerOpen(false)}
        open={isPwdDrawerOpen}
      >
        <Form form={pwdForm} layout="vertical" onFinish={onFinishPwd}>
          <Form.Item name="newPassword" label="Nouveau mot de passe" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Form.Item name="confirmation" label="Confirmer" dependencies={["newPassword"]}
            rules={[{ required: true }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                return Promise.reject(new Error("Les mots de passe ne correspondent pas"));
              }
            })]}>
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>
          <Button type="primary" block htmlType="submit" loading={passwordSaving} size="large">Mettre à jour</Button>
        </Form>
      </Drawer>
    </>
  );
}
