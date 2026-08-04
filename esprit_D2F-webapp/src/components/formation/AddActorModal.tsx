import { useEffect } from "react";
import { Modal, Form, Input, Select, Row, Col, Tag } from "antd";
import { UserAddOutlined, MailOutlined, IdcardOutlined, TeamOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";

export type ActorKind = "ANIMATEUR" | "PARTICIPANT";

export interface ActorDraft {
  nom: string;
  prenom: string;
  email: string;
  type: "P" | "V" | "C";
  cup: "O" | "N";
  chefDepartement: "O" | "N";
  upLibelle?: string;
  deptLibelle?: string;
}

export interface AddActorModalProps {
  open: boolean;
  kind: ActorKind;
  onCancel: () => void;
  onSubmit: (actor: ActorDraft) => Promise<void> | void;
  upOptions?: { value: string; label: string }[];
  deptOptions?: { value: string; label: string }[];
  existingEmails?: string[];
}

const TYPE_OPTIONS = [
  { value: "P", label: "Permanent" },
  { value: "V", label: "Vacataire" },
  { value: "C", label: "Contractuel" },
];

const CUP_OPTIONS = [
  { value: "N", label: "Non" },
  { value: "O", label: "Oui" },
];

const CHEF_OPTIONS = [
  { value: "N", label: "Non" },
  { value: "O", label: "Oui" },
];

export default function AddActorModal({
  open, kind, onCancel, onSubmit,
  upOptions = [], deptOptions = [], existingEmails = [],
}: Readonly<AddActorModalProps>) {
  const [form] = Form.useForm<ActorDraft>();
  const { message } = useAppNotification();
  const title = kind === "ANIMATEUR" ? "Ajouter un animateur" : "Ajouter un participant";
  const accent = kind === "ANIMATEUR" ? "var(--primary-500)" : "var(--color-info)";

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ type: "P", cup: "N", chefDepartement: "N" });
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const email = values.email.trim().toLowerCase();
      if (existingEmails.includes(email)) {
        message.warning("Cette personne (email) est déjà dans la liste.");
        return;
      }
      await onSubmit({ ...values, email });
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown };
      if (!e?.errorFields) {
        message.error("Échec de l'ajout");
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <UserAddOutlined style={{ color: accent }} />
          {title}
        </span>
      }
      okText="Ajouter"
      cancelText="Annuler"
      destroyOnHidden
      width={560}
    >
      <Tag color={kind === "ANIMATEUR" ? "red" : "blue"} style={{ marginBottom: 12 }}>
        <TeamOutlined /> {kind === "ANIMATEUR" ? "Animateur (Formateur)" : "Participant (Enseignant)"}
      </Tag>
      <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 8 }}>
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="nom"
              label="Nom"
              rules={[{ required: true, message: "Le nom est requis" }, { whitespace: true, message: "Le nom ne peut pas être vide" }]}
            >
              <Input prefix={<IdcardOutlined style={{ color: "#cbd5e0" }} />} placeholder="Ex : Ben Salah" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="prenom"
              label="Prénom"
              rules={[{ required: true, message: "Le prénom est requis" }, { whitespace: true, message: "Le prénom ne peut pas être vide" }]}
            >
              <Input prefix={<IdcardOutlined style={{ color: "#cbd5e0" }} />} placeholder="Ex : Ahmed" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "L'email est requis" },
                { type: "email", message: "Format email invalide" },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: "#cbd5e0" }} />} placeholder="prenom.nom@esprit.tn" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="type" label="Type">
              <Select options={TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name="cup" label="CUP">
              <Select options={CUP_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="chefDepartement" label="Chef Dept">
              <Select options={CHEF_OPTIONS} />
            </Form.Item>
          </Col>
          {upOptions.length > 0 && (
            <Col xs={24} sm={12}>
              <Form.Item name="upLibelle" label="UP (optionnel)">
                <Select
                  allowClear
                  showSearch
                  placeholder="Choisir une UP"
                  options={upOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          )}
          {deptOptions.length > 0 && (
            <Col xs={24} sm={12}>
              <Form.Item name="deptLibelle" label="Département (optionnel)">
                <Select
                  allowClear
                  showSearch
                  placeholder="Choisir un département"
                  options={deptOptions}
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}
