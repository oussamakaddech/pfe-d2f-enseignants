import { useState } from "react";
import { Row, Col, Select, Button, Modal, Form, Input, Typography, Empty } from "antd";
import { BankOutlined, TeamOutlined, PlusOutlined, MailOutlined } from "@ant-design/icons";
import { useBureaux } from "@/hooks/bureau/useBureaux";
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

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const onChangeBureau = (val: number | null) => {
    setBureauId(val);
    // Réinitialiser la sélection lorsque le bureau change
    setAnimExterneSel([]);
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
            <Select
              size="large"
              allowClear
              showSearch
              style={{ width: "100%" }}
              value={bureauId ?? undefined}
              onChange={(val) => onChangeBureau(val ?? null)}
              optionFilterProp="label"
              placeholder="Sélectionner un bureau enregistré"
              options={bureaux.map((b) => ({ value: b.id, label: b.nom }))}
              notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun bureau — créez-en un dans Gestion des Bureaux" />}
            />
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
    </div>
  );
}
