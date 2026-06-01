/* ─────────────────────────────────────────────────────────────────────────
 * BesoinParametresStep — Step 4: Accessibilité, évaluation & infos supp.
 * ─────────────────────────────────────────────────────────────────────── */
import { Form, Input, Select } from "antd";
import { ApartmentOutlined, CheckCircleOutlined, BookOutlined } from "@ant-design/icons";
import SectionLabel from "@/components/besoin/SectionLabel";

const { Option } = Select;
const { TextArea } = Input;

export default function BesoinParametresStep() {
  return (
    <div className="bf-step">
      <SectionLabel
        icon={<ApartmentOutlined />}
        title="Accessibilité de la formation"
        hint="Réservée à l'UP ou ouverte à d'autres unités ?"
      />
      <Form.Item label="Type de formation" name="estOuverte">
        <Select placeholder="Ouverte ou fermée ?" size="large">
          <Option value={false}>Fermée — réservée aux participants de l'UP</Option>
          <Option value={true}>Ouverte — accessible à d'autres UPs</Option>
        </Select>
      </Form.Item>

      <SectionLabel
        icon={<CheckCircleOutlined />}
        title="Méthodes d'évaluation"
        hint="Comment évaluer les acquis ?"
      />
      <Form.Item label="Méthodes d'évaluation" name="methodesEvaluationAcquis">
        <Input placeholder="Ex : Quiz, Projet, QCM, mise en situation..." size="large" />
      </Form.Item>

      <SectionLabel
        icon={<BookOutlined />}
        title="Informations complémentaires"
        hint="Remarques, contraintes, contexte particulier"
      />
      <Form.Item label="Autres informations" name="autresInformations">
        <TextArea rows={4} placeholder="Informations additionnelles, spécificités, remarques particulières..." showCount maxLength={1000} />
      </Form.Item>
    </div>
  );
}
