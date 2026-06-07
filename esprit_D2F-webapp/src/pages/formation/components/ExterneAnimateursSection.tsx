import { useState } from "react";
import { Row, Col, Select, Button, Modal, Form, Input, Typography, Empty } from "antd";
import { BankOutlined, TeamOutlined, PlusOutlined, MailOutlined, PhoneOutlined } from "@ant-design/icons";
import { useBureaux, useCreateBureau } from "@/hooks/bureau/useBureaux";
import { useAnimateursExternes, useCreateAnimateurExterne } from "@/hooks/bureau/useAnimateursExternes";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { AnimateurExterne } from "@/models/bureau";

const { Text } = Typography;

export type ExterneAnimateursSectionProps = Readonly<{
  bureauId: number | null;
  setBureauId: (v: number | null) => void;
  animExterneSel: AnimateurExterne[];
  setAnimExterneSel: (v: AnimateurExterne[]) => void;
}>;

export default function ExterneAnimateursSection({ bureauId, setBureauId, animExterneSel, setAnimExterneSel }: ExterneAnimateursSectionProps) {
  const { message: msgApi } = useAppNotification();
  const { data: bureaux = [] } = useBureaux();
  const { data: animateurs = [], isLoading } = useAnimateursExternes(bureauId);
  const createMut = useCreateAnimateurExterne();
  const createBureauMut = useCreateBureau();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [bureauModalOpen, setBureauModalOpen] = useState(false);
  const [bureauForm] = Form.useForm();

  const onChangeBureau = (val: number | null) => {
    setBureauId(val);
    // Réinitialiser la sélection lorsque le bureau change
    setAnimExterneSel([]);
  };

  // Crée un VRAI bureau (entité persistée) → il apparaît immédiatement dans
  // « Gestion des Bureaux » (/home/bureaux) et est auto-sélectionné ici.
  const handleCreateBureau = async () => {
    try {
      const values = await bureauForm.validateFields();
      const created = await createBureauMut.mutateAsync(values);
      msgApi.success(`Bureau « ${created.nom} » créé et enregistré dans Gestion des Bureaux`);
      onChangeBureau(created.id);
      setBureauModalOpen(false);
      bureauForm.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      msgApi.error(e?.response?.data?.message || "Erreur lors de la création du bureau");
    }
  };

  const handleAdd = async () => {
    if (bureauId == null) return;
    try {
      const values = await form.validateFields();
      const created = await createMut.mutateAsync({ bureauId, data: values });
      msgApi.success("Animateur ajouté au bureau");
      setAnimExterneSel([...animExterneSel, created]);
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { errorFields?: unknown; response?: { data?: { message?: string } } };
      if (e?.errorFields) return;
      msgApi.error(e?.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  const animLabel = (a: AnimateurExterne) => `${a.prenom} ${a.nom}${a.email ? ` · ${a.email}` : ""}`;

  return (
    <div className="creation-externe-box">
      <Text className="creation-externe-title">
        <TeamOutlined style={{ marginRight: 6 }} />Animateurs externes (par bureau)
      </Text>
      <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} sm={10}>
          <div className="creation-field">
            <label className="creation-field-label"><BankOutlined /> Bureau de formation</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Select
                size="large"
                allowClear
                showSearch
                style={{ flex: 1 }}
                value={bureauId ?? undefined}
                onChange={(val) => onChangeBureau(val ?? null)}
                optionFilterProp="label"
                placeholder="Sélectionner un bureau enregistré"
                options={bureaux.map((b) => ({ value: b.id, label: b.nom }))}
                notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun bureau — créez-en un ci-contre" />}
              />
              <Button
                size="large"
                icon={<PlusOutlined />}
                onClick={() => { bureauForm.resetFields(); setBureauModalOpen(true); }}
                title="Créer un nouveau bureau (ajouté à Gestion des Bureaux)"
              >
                Nouveau
              </Button>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={14}>
          <div className="creation-field">
            <label className="creation-field-label"><TeamOutlined /> Animateurs</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Select
                mode="multiple"
                size="large"
                style={{ flex: 1 }}
                disabled={bureauId == null}
                loading={isLoading}
                value={animExterneSel.map((a) => a.id)}
                onChange={(vals) => setAnimExterneSel(animateurs.filter((a) => vals.includes(a.id)))}
                optionFilterProp="label"
                placeholder={bureauId == null ? "Choisissez d'abord un bureau" : "Sélectionner les animateurs..."}
                options={animateurs.map((a) => ({ value: a.id, label: animLabel(a) }))}
              />
              <Button
                size="large"
                icon={<PlusOutlined />}
                disabled={bureauId == null}
                onClick={() => { form.resetFields(); setModalOpen(true); }}
                title="Ajouter un nouvel animateur à ce bureau"
              >
                Ajouter
              </Button>
            </div>
            <span className="creation-field-help">
              {bureauId == null
                ? "Les animateurs sont rattachés à un bureau. Sélectionnez un bureau pour voir/ajouter ses animateurs."
                : `${animateurs.length} animateur(s) disponible(s) dans ce bureau — sélectionnez-en un ou plusieurs.`}
            </span>
          </div>
        </Col>
      </Row>

      <Modal
        title="Nouvel animateur externe"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleAdd}
        confirmLoading={createMut.isPending}
        okText="Ajouter"
        cancelText="Annuler"
        destroyOnHidden
        width={440}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Le nom est requis" }]}>
            <Input placeholder="Nom" />
          </Form.Item>
          <Form.Item name="prenom" label="Prénom" rules={[{ required: true, message: "Le prénom est requis" }]}>
            <Input placeholder="Prénom" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email invalide" }]}>
            <Input placeholder="email@organisme.com" prefix={<MailOutlined style={{ color: "#cbd5e0" }} />} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Nouveau bureau de formation"
        open={bureauModalOpen}
        onCancel={() => { setBureauModalOpen(false); bureauForm.resetFields(); }}
        onOk={handleCreateBureau}
        confirmLoading={createBureauMut.isPending}
        okText="Créer"
        cancelText="Annuler"
        destroyOnHidden
        width={440}
      >
        <Form form={bureauForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="nom" label="Nom du bureau" rules={[{ required: true, message: "Le nom est requis" }]}>
            <Input placeholder="Ex : Bureau Formation Tunis" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "L'email est requis" }, { type: "email", message: "Email invalide" }]}
          >
            <Input placeholder="bureau@organisme.com" prefix={<MailOutlined style={{ color: "#cbd5e0" }} />} />
          </Form.Item>
          <Form.Item name="numeroTelephone" label="Téléphone" rules={[{ required: true, message: "Le téléphone est requis" }]}>
            <Input placeholder="+216 XX XXX XXX" prefix={<PhoneOutlined style={{ color: "#cbd5e0" }} />} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
