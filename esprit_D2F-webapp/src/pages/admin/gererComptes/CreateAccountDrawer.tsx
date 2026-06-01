import { useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Progress,
  Divider,
  Space,
  Alert,
  Row,
  Col,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  IdcardOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { createAccount } from "@/services/auth/AccountService";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Option } = Select;

export const ACCOUNT_ROLES: Array<{ value: string; label: string; description: string }> = [
  { value: "ADMIN",              label: "Administrateur",     description: "Tous les droits sur l'application"        },
  { value: "CUP",                label: "CUP",                description: "Chef d'Unité Pédagogique"                  },
  { value: "CHEF_DEPARTEMENT",   label: "Chef de département", description: "Responsable d'un département"            },
  { value: "RESPONSABLE_DOSSIER",label: "Responsable dossier", description: "Gestion des dossiers de formation"       },
  { value: "ENSEIGNANT",         label: "Enseignant",         description: "Accès enseignant standard"                 },
  { value: "ANIMATEUR",          label: "Animateur",          description: "Anime des formations et les séances"       },
];

export interface CreateAccountFormValues {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: string;
}

interface CreateAccountDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Pré-remplir les champs (ex. depuis un enseignant sélectionné) */
  initialValues?: Partial<CreateAccountFormValues>;
  title?: string;
  subtitle?: string;
}

type StrengthStatus = "success" | "exception" | "normal" | "active";

function getPasswordStrength(pwd: string | undefined): {
  percent: number;
  label: string;
  status: StrengthStatus;
  checks: Array<{ ok: boolean; label: string }>;
} {
  const checks = [
    { ok: !!pwd && pwd.length >= 8,                  label: "Au moins 8 caractères"   },
    { ok: !!pwd && /[A-Z]/.test(pwd),                label: "Une lettre majuscule"    },
    { ok: !!pwd && /[a-z]/.test(pwd),                label: "Une lettre minuscule"    },
    { ok: !!pwd && /\d/.test(pwd),                   label: "Un chiffre"              },
    { ok: !!pwd && /[^A-Za-z0-9]/.test(pwd),         label: "Un caractère spécial"    },
  ];
  const score = checks.filter((c) => c.ok).length;
  const percent = (score / checks.length) * 100;
  let label = "—";
  let status: StrengthStatus = "normal";
  if (score === 0) { label = "—"; status = "normal"; }
  else if (score <= 2) { label = "Faible"; status = "exception"; }
  else if (score <= 3) { label = "Moyen"; status = "active"; }
  else if (score <= 4) { label = "Bon";   status = "normal"; }
  else { label = "Fort";   status = "success"; }
  return { percent, label, status, checks };
}

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export default function CreateAccountDrawer({
  open,
  onClose,
  onSuccess,
  initialValues,
  title = "Créer un compte",
  subtitle = "Renseignez les informations du nouveau compte. Le rôle détermine les permissions accordées.",
}: Readonly<CreateAccountDrawerProps>) {
  const [form] = Form.useForm<CreateAccountFormValues>();
  const { message } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const passwordValue = Form.useWatch("password", form);
  const strength = getPasswordStrength(passwordValue);
  const roleValue = Form.useWatch("role", form);
  const roleMeta = ACCOUNT_ROLES.find((r) => r.value === roleValue);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (initialValues) {
      form.setFieldsValue({
        role: "ENSEIGNANT",
        ...initialValues,
      });
    } else {
      form.setFieldsValue({ role: "ENSEIGNANT" });
    }
  }, [open, initialValues, form]);

  const handleClose = () => {
    if (loading) return;
    form.resetFields();
    onClose();
  };

  const onFinish = async (values: CreateAccountFormValues) => {
    if (values.password !== values.confirmPassword) {
      form.setFields([{ name: "confirmPassword", errors: ["Les mots de passe ne correspondent pas"] }]);
      return;
    }
    setLoading(true);
    try {
      await createAccount(
        {
          username: values.username,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: values.phoneNumber,
          email: values.email,
        },
        values.role,
      );
      message.success(`Compte "${values.username}" créé avec succès`);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e?.response?.data?.message || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={560}
      destroyOnHidden
      maskClosable={!loading}
      closable={false}
      styles={{
        body: { padding: 0, background: "var(--bg-main)" },
        header: { display: "none" },
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--brand-gradient)",
          padding: "24px 28px 22px",
          color: "var(--text-on-dark)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.10)",
            top: -90,
            right: -70,
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            bottom: -80,
            left: -40,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            <IdcardOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{title}</div>
            <div style={{ fontSize: 13, opacity: 0.82, marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>
          </div>
          <Button
            type="text"
            onClick={handleClose}
            disabled={loading}
            aria-label="Fermer"
            style={{
              color: "rgba(255,255,255,0.85)",
              width: 32,
              height: 32,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CloseCircleFilled style={{ fontSize: 16 }} />
          </Button>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 28px 96px" }}>
        <Form<CreateAccountFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          scrollToFirstError
        >
          <SectionTitle icon={<UserOutlined />} title="Identité" />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="Prénom"
                rules={[
                  { required: true, message: "Le prénom est requis" },
                  { min: 2, message: "Au moins 2 caractères" },
                ]}
              >
                <Input placeholder="Prénom" autoComplete="given-name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Nom"
                rules={[
                  { required: true, message: "Le nom est requis" },
                  { min: 2, message: "Au moins 2 caractères" },
                ]}
              >
                <Input placeholder="Nom" autoComplete="family-name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Adresse email"
            rules={[
              { required: true, message: "L'email est requis" },
              { type: "email", message: "Email invalide" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="prenom.nom@esprit.tn" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="phoneNumber"
            label="Téléphone"
            rules={[
              { required: true, message: "Le téléphone est requis" },
              { pattern: /^[0-9+\s().-]{8,20}$/, message: "Numéro de téléphone invalide" },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Ex : 0612345678" autoComplete="tel" />
          </Form.Item>

          <Divider style={{ margin: "8px 0 18px" }} />

          <SectionTitle icon={<LockOutlined />} title="Identifiants de connexion" />

          <Form.Item
            name="username"
            label="Nom d'utilisateur"
            extra="3 à 20 caractères (lettres, chiffres, tirets, underscores)"
            rules={[
              { required: true, message: "Le nom d'utilisateur est requis" },
              { min: 3, max: 20, message: "Entre 3 et 20 caractères" },
              { pattern: /^[a-zA-Z0-9._-]+$/, message: "Caractères autorisés : lettres, chiffres, . _ -" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="nom.utilisateur" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mot de passe"
            extra="Au moins 8 caractères, avec au moins une lettre et un chiffre"
            rules={[
              { required: true, message: "Le mot de passe est requis" },
              { pattern: PASSWORD_REGEX, message: "Au moins 8 caractères, une lettre et un chiffre" },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>

          {passwordValue ? (
            <div style={{ marginTop: -8, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Robustesse</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      strength.status === "success" ? "var(--color-success)" :
                      strength.status === "exception" ? "var(--color-error)" :
                      strength.status === "active" ? "var(--color-warning)" :
                      "var(--text-muted)",
                  }}
                >
                  {strength.label}
                </span>
              </div>
              <Progress percent={strength.percent} status={strength.status} showInfo={false} size="small" />
              <Space size={4} wrap style={{ marginTop: 8 }}>
                {strength.checks.map((c) => (
                  <span
                    key={c.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: c.ok ? "var(--color-success)" : "var(--text-disabled)",
                    }}
                  >
                    {c.ok
                      ? <CheckCircleFilled style={{ fontSize: 11 }} />
                      : <CloseCircleFilled style={{ fontSize: 11 }} />}
                    {c.label}
                  </span>
                ))}
              </Space>
            </div>
          ) : null}

          <Form.Item
            name="confirmPassword"
            label="Confirmer le mot de passe"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Veuillez confirmer le mot de passe" },
              ({ getFieldValue }) => ({
                validator(_: unknown, value: string) {
                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                  return Promise.reject(new Error("Les mots de passe ne correspondent pas"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="new-password" />
          </Form.Item>

          <Divider style={{ margin: "8px 0 18px" }} />

          <SectionTitle icon={<SafetyCertificateOutlined />} title="Rôle & permissions" />

          <Form.Item
            name="role"
            label="Rôle"
            extra={roleMeta ? roleMeta.description : "Sélectionnez le rôle à attribuer"}
            rules={[{ required: true, message: "Le rôle est requis" }]}
          >
            <Select placeholder="Sélectionner un rôle" size="middle">
              {ACCOUNT_ROLES.map((r) => (
                <Option key={r.value} value={r.value}>
                  {r.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Sécurité"
            description="Ce compte sera créé avec le rôle sélectionné. L'administrateur pourra modifier ou bloquer le compte à tout moment depuis la gestion des utilisateurs."
            style={{ marginTop: 4 }}
          />
        </Form>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "14px 24px",
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          zIndex: 5,
        }}
      >
        <Button onClick={handleClose} disabled={loading} size="middle">
          Annuler
        </Button>
        <Button
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
          icon={<UserOutlined />}
          style={{
            background: "var(--btn-primary-gradient)",
            border: "none",
            fontWeight: 600,
            boxShadow: "var(--btn-primary-shadow)",
          }}
        >
          Créer le compte
        </Button>
      </div>
    </Drawer>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--text-muted)",
        marginBottom: 12,
      }}
    >
      <span style={{ color: "var(--primary-500)" }}>{icon}</span>
      {title}
    </div>
  );
}
