// src/components/MailForm.jsx
import PropTypes from "prop-types";
import { Form, Input, Button, message } from "antd";
import moment from "moment";
import MailService from "../services/MailService";

export default function MailForm({ formation, onSendSuccess }) {
  const [form] = Form.useForm();

  // 1) Valeurs par défaut
  const defaultTo = formation?.responsableEmail || "";
  const defaultSubject = formation
    ? `Formation "${formation.titreFormation}" planifiée du ${moment(formation.dateDebut).format(
        "DD/MM/YYYY"
      )} au ${moment(formation.dateFin).format("DD/MM/YYYY")}`
    : "";

  // Objectif
  const objectifStr = formation.objectif
    ? `Objectif : ${formation.objectif}\n\n`
    : "";

  // Séances
  const seancesStr = (formation.seances || [])
    .map(
      (s, i) =>
        `${i + 1}. ${moment(s.dateSeance).format("DD/MM/YYYY")} de ${
          s.heureDebut
        } à ${s.heureFin}${s.salle ? ` en salle ${s.salle}` : ""}`
    )
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
      `Votre formation "${formation.titreFormation}" se déroulera du ${moment(
        formation.dateDebut
      ).format("DD/MM/YYYY")} au ${moment(formation.dateFin).format(
        "DD/MM/YYYY"
      )}.\n\n` +
      `Détail des séances :\n${seancesStr}\n\n` +
      `${animateursStr}${participantsStr}` +
      "Cordialement,\nL'équipe de formation"
    : "";

  // 2) Envoi
  const handleFinish = async (values) => {
    try {
      await MailService.sendEmail(values.to, values.subject, values.content);
      message.success("📨 E-mail envoyé avec succès !");
      form.resetFields(["subject", "content"]);
      if (onSendSuccess) onSendSuccess();
    } catch (err) {
      console.error(err);
      message.error("❌ Échec de l’envoi de l’e-mail.");
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

MailForm.propTypes = {
  formation: PropTypes.shape({
    responsableEmail: PropTypes.string.isRequired,
    responsableName: PropTypes.string,
    titreFormation: PropTypes.string.isRequired,
    dateDebut: PropTypes.string.isRequired,
    dateFin: PropTypes.string.isRequired,
    objectif: PropTypes.string,
    seances: PropTypes.arrayOf(
      PropTypes.shape({
        dateSeance: PropTypes.string,
        heureDebut: PropTypes.string,
        heureFin: PropTypes.string,
        salle: PropTypes.string,
        animateurs: PropTypes.arrayOf(
          PropTypes.shape({
            nom: PropTypes.string,
            prenom: PropTypes.string,
            mail: PropTypes.string,
            unitePedagogique: PropTypes.shape({
              nomUP: PropTypes.string,
            }),
          })
        ),
        participants: PropTypes.arrayOf(
          PropTypes.shape({
            nom: PropTypes.string,
            prenom: PropTypes.string,
            mail: PropTypes.string,
            unitePedagogique: PropTypes.shape({
              nomUP: PropTypes.string,
            }),
          })
        ),
      })
    ).isRequired,
  }).isRequired,
  onSendSuccess: PropTypes.func,
};

MailForm.defaultProps = {
  onSendSuccess: null,
};
