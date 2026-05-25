import { Modal, Form, Input, Select } from "antd";
import { MailOutlined, FileTextOutlined } from "@ant-design/icons";

const { TextArea } = Input;

interface BesoinMailModalProps {
  open: boolean;
  mailSending: boolean;
  mailRecord: { titre?: string; objectifFormation?: string } | null;
  cupAccounts: Array<{ email?: string; emailAddress?: string; userName?: string; username?: string }>;
  form: ReturnType<typeof Form.useForm>[0];
  onOk: () => void;
  onCancel: () => void;
}

export default function BesoinMailModal({ open, mailSending, mailRecord, cupAccounts, form, onOk, onCancel }: BesoinMailModalProps) {
  return (
    <Modal
      title={
        <span className="bf-modal__title">
          <span className="bf-modal__title-icon"><MailOutlined /></span>
          {" "}Demander des informations au CUP
        </span>
      }
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={mailSending}
      okText="Envoyer l'e-mail"
      cancelText="Annuler"
      width={680}
      className="bf-modal bf-modal--mail"
      okButtonProps={{ className: "bf-btn bf-btn--primary", icon: <MailOutlined /> }}
    >
      {mailRecord && (
        <div className="bf-mail-context">
          <span className="bf-mail-context__icon"><FileTextOutlined /></span>
          <div>
            <div className="bf-mail-context__label">Besoin concerné</div>
            <div className="bf-mail-context__value">
              {mailRecord.titre || mailRecord.objectifFormation || "—"}
            </div>
          </div>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          label="Destinataire (CUP)"
          name="to"
          rules={[
            { required: true, message: "Veuillez saisir ou choisir un destinataire" },
            { type: "email", message: "Adresse e-mail invalide" },
          ]}
        >
          {cupAccounts.length > 0 ? (
            <Select
              showSearch
              placeholder="Sélectionner un CUP ou saisir une adresse"
              size="large"
              optionFilterProp="label"
              options={cupAccounts.map((c) => {
                const mail = c.email || c.emailAddress;
                const name = c.userName || c.username || mail;
                return { value: mail, label: `${name} <${mail}>` };
              })}
            />
          ) : (
            <Input placeholder="cup@esprit.tn" size="large" prefix={<MailOutlined />} />
          )}
        </Form.Item>
        <Form.Item label="Sujet" name="subject" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
        <Form.Item label="Contenu" name="content" rules={[{ required: true }]}>
          <TextArea rows={12} className="bf-mail-textarea" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
