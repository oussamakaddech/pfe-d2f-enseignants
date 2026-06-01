/* ─────────────────────────────────────────────────────────────────────────
 * BesoinMailCupModal — Modal to send info request email to CUP
 * ─────────────────────────────────────────────────────────────────────── */
import { Modal, Form, Input, Select } from "antd";
import { MailOutlined, FileTextOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd";

const { TextArea } = Input;

interface CupAccount { email?: string; emailAddress?: string; userName?: string; username?: string }

interface BesoinMailCupModalProps {
  open: boolean;
  mailRecord: Record<string, unknown> | null;
  mailForm: FormInstance;
  cupAccounts: CupAccount[];
  sending: boolean;
  onConfirm: (to: string, subject: string, content: string) => void;
  onCancel: () => void;
}

// Pure function — no hooks
export function buildFormationNeedHtmlEmail(
  record: Record<string, unknown>,
  upLabel: string,
  deptLabel: string,
  periodLabel: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a202c;background:#f7fafc;padding:20px}
    .container{max-width:720px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.07)}
    .header{background:linear-gradient(135deg,#B51200 0%,#9a0f00 100%);color:white;padding:35px 30px;text-align:center}
    .header h1{font-size:26px;margin:0;font-weight:600}
    .content{padding:35px 30px}
    .intro{background:#fff0ee;border-left:4px solid #B51200;padding:15px 18px;margin-bottom:28px;border-radius:4px;color:#7a0000;line-height:1.6;font-weight:500;font-size:14px}
    .section-title{font-size:13px;color:#1a202c;font-weight:700;margin-top:28px;margin-bottom:16px;text-transform:uppercase;letter-spacing:.8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
    .info-item{background:#f7fafc;padding:12px 14px;border-radius:4px;border-left:3px solid #B51200}
    .info-label{font-weight:700;color:#1a202c;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
    .info-value{color:#2d3748;margin-top:4px;font-size:14px;font-weight:500}
    .questions-section{background:#fff0ee;border-left:3px solid #B51200;padding:18px 16px;border-radius:4px;margin-top:18px}
    .question-item{margin-bottom:12px;padding:8px 0;display:flex;align-items:flex-start}
    .question-number{display:inline-flex;background:#B51200;color:white;width:26px;height:26px;border-radius:50%;align-items:center;justify-content:center;font-weight:700;margin-right:12px;font-size:12px;flex-shrink:0}
    .question-text{color:#1a202c;line-height:1.5;font-size:14px;font-weight:500}
    .cta-box{background:#f0fdf4;border-left:4px solid #10b981;padding:14px 16px;margin-top:24px;border-radius:4px;color:#065f46;font-weight:500;font-size:13px}
    .footer{background:#f7fafc;border-top:1px solid #e2e8f0;padding:18px 30px;text-align:center;font-size:11px;color:#718096}
    .logo{color:#B51200;font-weight:700}
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Demande d'Informations Complémentaires</h1></div>
    <div class="content">
      <div class="intro">Dans le cadre de l'instruction du besoin de formation ci-dessous, nous sollicitons votre éclairage en tant que CUP afin de compléter les informations manquantes avant approbation.</div>
      <div class="section-title">Récapitulatif du Besoin</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">Titre</div><div class="info-value">${record.titre || record.objectifFormation || "—"}</div></div>
        <div class="info-item"><div class="info-label">Demandeur</div><div class="info-value">${record.username || "—"}</div></div>
        <div class="info-item"><div class="info-label">Type</div><div class="info-value">${record.typeBesoin || "—"}</div></div>
        <div class="info-item"><div class="info-label">Priorité</div><div class="info-value">${record.priorite || "—"}</div></div>
        <div class="info-item"><div class="info-label">UP</div><div class="info-value">${upLabel}</div></div>
        <div class="info-item"><div class="info-label">Département</div><div class="info-value">${deptLabel}</div></div>
        <div class="info-item"><div class="info-label">Période</div><div class="info-value">${periodLabel}</div></div>
        <div class="info-item"><div class="info-label">Objectif</div><div class="info-value">${record.objectifFormation || "—"}</div></div>
      </div>
      <div class="section-title">Vos Précisions Requises</div>
      <div class="questions-section">
        <div class="question-item"><span class="question-number">1</span><span class="question-text">La pertinence stratégique de ce besoin pour votre UP</span></div>
        <div class="question-item"><span class="question-number">2</span><span class="question-text">Le profil et le nombre exact de participants attendus</span></div>
        <div class="question-item"><span class="question-number">3</span><span class="question-text">Toute contrainte de planning ou pré-requis spécifique</span></div>
      </div>
      <div class="cta-box">✅ Merci de nous transmettre ces informations complémentaires dès que possible pour accélérer le traitement de cette demande.</div>
    </div>
    <div class="footer"><p>Ceci est un e-mail automatique généré par le système D2F.</p><p><span class="logo">ESPRIT</span> • Direction du Développement et de la Formation</p><p>© 2026 • Tous droits réservés</p></div>
  </div>
</body>
</html>`;
}

export default function BesoinMailCupModal({
  open,
  mailRecord,
  mailForm,
  cupAccounts,
  sending,
  onConfirm,
  onCancel,
}: Readonly<BesoinMailCupModalProps>) {
  const handleOk = async () => {
    const values = await mailForm.validateFields();
    onConfirm(values.to, values.subject, values.content);
  };

  return (
    <Modal
      title={<span className="bf-modal__title"><span className="bf-modal__title-icon"><MailOutlined /></span>{" "}Demander des informations au CUP</span>}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={sending}
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
            <div className="bf-mail-context__value">{String(mailRecord.titre || mailRecord.objectifFormation || "—")}</div>
          </div>
        </div>
      )}
      <Form form={mailForm} layout="vertical">
        <Form.Item
          label="Destinataire (CUP)"
          name="to"
          rules={[{ required: true, message: "Veuillez saisir ou choisir un destinataire" }, { type: "email", message: "Adresse e-mail invalide" }]}
        >
          {cupAccounts.length > 0 ? (
            <Select
              showSearch
              placeholder="Sélectionner un CUP ou saisir une adresse"
              size="large"
              optionFilterProp="label"
              options={cupAccounts.map((c) => {
                const mail = c.email || c.emailAddress || "";
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
          <Input.TextArea rows={12} className="bf-mail-textarea" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
