import { Row, Col, Input, InputNumber, Alert as AntAlert } from "antd";
import { DollarOutlined } from "@ant-design/icons";

export type CostsStepProps = {
  typeFormation: string;
  organisme: string; setOrganisme: (v: string) => void;
  cout: number; setCout: (v: number) => void;
  coutTransport: number; setCoutTransport: (v: number) => void;
  coutHebergement: number; setCoutHebergement: (v: number) => void;
  coutRepas: number; setCoutRepas: (v: number) => void;
};

export default function CostsStep({ typeFormation, organisme, setOrganisme, cout, setCout, coutTransport, setCoutTransport, coutHebergement, setCoutHebergement, coutRepas, setCoutRepas }: Readonly<CostsStepProps>) {
  return (
    <div>
      <div className="creation-section-box">
        <div className="creation-section-box-title"><DollarOutlined /> Budget &amp; Coûts</div>
        {typeFormation === "EXTERNE" ? (
          <Row gutter={[20, 16]}>
            <Col xs={24} sm={12}>
              <div className="creation-field">
                <label className="creation-field-label" htmlFor="cout-organisme">Organisme Prestataire</label>
                <Input id="cout-organisme" size="large" value={organisme} onChange={(e) => setOrganisme(e.target.value)} placeholder="Nom de l'organisme..." />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="creation-field">
                <label className="creation-field-label"><DollarOutlined /> Frais de Formation (DT)</label>
                <InputNumber size="large" style={{ width: "100%" }} suffix="DT" value={cout} onChange={(val) => setCout(val ?? 0)} min={0} />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="creation-field">
                <label className="creation-field-label" htmlFor="cout-transport">Coût Transport (DT)</label>
                <InputNumber id="cout-transport" size="large" style={{ width: "100%" }} value={coutTransport} onChange={(val) => setCoutTransport(val ?? 0)} min={0} />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="creation-field">
                <label className="creation-field-label" htmlFor="cout-hebergement">Coût Hébergement (DT)</label>
                <InputNumber id="cout-hebergement" size="large" style={{ width: "100%" }} value={coutHebergement} onChange={(val) => setCoutHebergement(val ?? 0)} min={0} />
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="creation-field">
                <label className="creation-field-label" htmlFor="cout-repas">Coût Repas (DT)</label>
                <InputNumber id="cout-repas" size="large" style={{ width: "100%" }} value={coutRepas} onChange={(val) => setCoutRepas(val ?? 0)} min={0} />
              </div>
            </Col>
          </Row>
        ) : (
          <AntAlert type="info" showIcon className="creation-alert-costs" message="Aucun coût direct pour cette formation" description="Pour les formations internes ou en ligne, les coûts directs sont généralement nuls. Seule la charge horaire est comptabilisée." />
        )}
      </div>
    </div>
  );
}
