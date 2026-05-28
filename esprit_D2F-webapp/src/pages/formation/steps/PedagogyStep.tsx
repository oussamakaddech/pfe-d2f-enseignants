import { Row, Col, Input } from "antd";
import { ReadOutlined } from "@ant-design/icons";

const { TextArea } = Input;

export type PedagogyStepProps = {
  domaine: string; setDomaine: (v: string) => void;
  populationCible: string; setPopulationCible: (v: string) => void;
  objectifs: string; setObjectifs: (v: string) => void;
  objectifsPedago: string; setObjectifsPedago: (v: string) => void;
  evalMethods: string; setEvalMethods: (v: string) => void;
};

export default function PedagogyStep({ domaine, setDomaine, populationCible, setPopulationCible, objectifs, setObjectifs, objectifsPedago, setObjectifsPedago, evalMethods, setEvalMethods }: Readonly<PedagogyStepProps>) {
  const fields: { label: string; val: string; set: (v: string) => void; placeholder: string; multiline?: boolean }[] = [
    { label: "Domaine / Thème", val: domaine, set: setDomaine, placeholder: "Ex : Informatique, Management..." },
    { label: "Population Cible", val: populationCible, set: setPopulationCible, placeholder: "Ex : Enseignants permanents..." },
    { label: "Objectifs Généraux", val: objectifs, set: setObjectifs, multiline: true, placeholder: "Décrire les objectifs généraux de la formation..." },
    { label: "Objectifs Pédagogiques", val: objectifsPedago, set: setObjectifsPedago, multiline: true, placeholder: "Détails des compétences à acquérir..." },
    { label: "Méthodes d'Évaluation", val: evalMethods, set: setEvalMethods, placeholder: "Ex : Quiz, Projet, QCM..." },
  ];

  return (
    <div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><ReadOutlined /> Contenu Pédagogique</div>
        <Row gutter={[20, 16]}>
          {fields.map((f) => (
            <Col xs={24} sm={f.multiline ? 24 : 12} key={f.label}>
              <div className="creation-field">
                <label className="creation-field-label">{f.label}</label>
                {f.multiline ? (
                  <TextArea rows={3} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
                ) : (
                  <Input size="large" value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
                )}
              </div>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
