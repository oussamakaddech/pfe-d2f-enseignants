import "@/styles/pages/mail-form.css";
import { Form, Input, Button } from "antd";
import dayjs from "dayjs";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useSendEmail } from "@/hooks/formation/useFormationExtras";

interface Personne { nom?: string; prenom?: string; mail?: string; unitePedagogique?: { nomUP?: string } }
interface Seance { dateSeance?: string; heureDebut?: string; heureFin?: string; salle?: string; animateurs?: Personne[]; participants?: Personne[] }
interface Formation {
  responsableEmail: string;
  responsableName?: string;
  titreFormation: string;
  dateDebut: string;
  dateFin: string;
  objectif?: string;
  seances?: Seance[];
}
interface MailFormProps { formation: Formation; onSendSuccess?: () => void }

export default function MailForm({ formation, onSendSuccess }: Readonly<MailFormProps>) {
  const { message } = useAppNotification();
  const [form] = Form.useForm();

  // 1) Valeurs par défaut
  const defaultTo = formation?.responsableEmail || "";
  const defaultSubject = formation
    ? `Formation "${formation.titreFormation}" planifiée du ${dayjs(formation.dateDebut).format(
        "DD/MM/YYYY"
      )} au ${dayjs(formation.dateFin).format("DD/MM/YYYY")}`
    : "";

  // Objectif
  const objectifStr = formation.objectif
    ? `Objectif : ${formation.objectif}\n\n`
    : "";

  // Séances
  const seancesStr = (formation.seances || [])
    .map((s, i) => {
      const salle = s.salle ? ` en salle ${s.salle}` : "";
      return `${i + 1}. ${dayjs(s.dateSeance).format("DD/MM/YYYY")} de ${s.heureDebut} à ${s.heureFin}${salle}`;
    })
    .join("\n");

  // Animateurs uniques, clé = mail
  const animateursMap = new Map();
  (formation.seances || []).forEach((s) =>
    (s.animateurs || []).forEach((a) => animateursMap.set(a.mail, a))
  );
  const animateursList = Array.from(animateursMap.values());
  const animateursStr = animateursList.length
    ? "Animateurs :\n" +
      animateursList
        .map(
          (a, i) =>
            `${i + 1}. ${a.nom} ${a.prenom} (${a.mail}${
              a.unitePedagogique?.nomUP ? ` – UP : ${a.unitePedagogique.nomUP}` : ""
            })`
        )
        .join("\n") +
      "\n\n"
    : "";

  // Participants uniques, clé = mail
  const participantsMap = new Map();
  (formation.seances || []).forEach((s) =>
    (s.participants || []).forEach((p) => participantsMap.set(p.mail, p))
  );
  const participantsList = Array.from(participantsMap.values());
  const participantsStr = participantsList.length
    ? "Participants :\n" +
      participantsList
        .map(
          (p, i) =>
            `${i + 1}. ${p.nom} ${p.prenom} (${p.mail}${
              p.unitePedagogique?.nomUP ? ` – UP : ${p.unitePedagogique.nomUP}` : ""
            })`
        )
        .join("\n") +
      "\n\n"
    : "";

  const defaultContent = formation
    ? `Bonjour ${formation.responsableName || "à tous"},\n\n` +
      `${objectifStr}` +
      `Votre formation "${formation.titreFormation}" se déroulera du ${dayjs(
        formation.dateDebut
      ).format("DD/MM/YYYY")} au ${dayjs(formation.dateFin).format(
        "DD/MM/YYYY"
      )}.\n\n` +
      `Détail des séances :\n${seancesStr}\n\n` +
      `${animateursStr}${participantsStr}` +
      "Cordialement,\nL'équipe de formation"
    : "";

  // 2) Envoi
  const { mutateAsync: sendEmail } = useSendEmail();
  const handleFinish = async (values: any) => {
    try {
      const result = await sendEmail({ to: values.to, subject: values.subject, content: values.content });
      const successMsg = result?.message || "📨 E-mail envoyé avec succès !";
      message.success(successMsg);
      form.resetFields(["subject", "content"]);
      if (onSendSuccess) onSendSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Échec de l’envoi de l’e-mail.";
      message.error(`❌ ${errorMsg}`);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        to: defaultTo,
        subject: defaultSubject,
        content: defaultContent,
      }}
      onFinish={handleFinish}
      style={{ marginTop: 16 }}
    >
      <Form.Item
        name="to"
        label="Destinataire"
        rules={[{ required: true, message: "Veuillez saisir une adresse e-mail." }]}
      >
        <Input placeholder="exemple@domaine.tn" />
      </Form.Item>

      <Form.Item
        name="subject"
        label="Sujet"
        rules={[{ required: true, message: "Le sujet ne peut pas être vide." }]}
      >
        <Input placeholder="Objet de l’e-mail" />
      </Form.Item>

      <Form.Item
        name="content"
        label="Contenu"
        rules={[{ required: true, message: "Le contenu ne peut pas être vide." }]}
      >
        <Input.TextArea rows={12} placeholder="Rédigez votre message…" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Envoyer
        </Button>
      </Form.Item>
    </Form>
  );
}







