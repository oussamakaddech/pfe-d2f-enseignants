import {
  Row, Col, Card, Typography, Alert, Empty, Divider, Tag
} from "antd";
import { BankOutlined } from "@ant-design/icons";
import type { LookupNode } from "../hooks/useFormationWorkflow";
import type { AnimateurExterne } from "@/models/bureau";
import ExterneAnimateursSection from "../components/ExterneAnimateursSection";

const { Text } = Typography;

export interface ExternalFormationActorsStepProps {
  ups: LookupNode[];
  depts: LookupNode[];

  // External Animateurs
  externeBureauId: number | null;
  setExterneBureauId: (v: number | null) => void;
  animExterneSel: AnimateurExterne[];
  setAnimExterneSel: (v: AnimateurExterne[]) => void;
  bureauNom: string;
  setBureauNom: (v: string) => void;
  bureauMail: string;
  setBureauMail: (v: string) => void;
  bureauTelephone: string;
  setBureauTelephone: (v: string) => void;
}

export default function ExternalFormationActorsStep(
  props: Readonly<ExternalFormationActorsStepProps>
) {
  const {
    externeBureauId,
    setExterneBureauId,
    animExterneSel,
    setAnimExterneSel,
    bureauNom,
    setBureauNom,
    bureauMail,
    setBureauMail,
    bureauTelephone,
    setBureauTelephone,
  } = props;

  return (
    <div>
      {/* External Trainers Section */}
      <div className="creation-section-box">
        <div className="creation-section-box-title">
          <BankOutlined /> Animateurs externes
        </div>

        <Alert
          message="Les animateurs externes sont rattachés à un bureau de formation."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Card className="creation-actor-card">
          <ExterneAnimateursSection
            bureauId={externeBureauId}
            setBureauId={setExterneBureauId}
            animExterneSel={animExterneSel}
            setAnimExterneSel={setAnimExterneSel}
          />

          <Row gutter={[16, 12]} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Text strong>Informations du bureau de formation</Text>
            </Col>
            <Col span={12}>
              <div style={{ display: "block", marginBottom: 8 }}>Nom du bureau</div>
              <input
                type="text"
                value={bureauNom}
                onChange={(e) => setBureauNom(e.target.value)}
                placeholder="Ex: Bureau Formation Tunis"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                }}
              />
            </Col>
            <Col span={12}>
              <div style={{ display: "block", marginBottom: 8 }}>Email du bureau</div>
              <input
                type="email"
                value={bureauMail}
                onChange={(e) => setBureauMail(e.target.value)}
                placeholder="bureau@example.com"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                }}
              />
            </Col>
            <Col span={12}>
              <div style={{ display: "block", marginBottom: 8 }}>Téléphone du bureau</div>
              <input
                type="tel"
                value={bureauTelephone}
                onChange={(e) => setBureauTelephone(e.target.value)}
                placeholder="+216 XX XXX XXX"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 12]} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Text strong>
                Animateurs externes sélectionnés ({animExterneSel.length})
              </Text>
            </Col>
            <Col span={24}>
              {animExterneSel.length === 0 ? (
                <Empty description="Aucun animateur externe sélectionné" />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {animExterneSel.map((a) => (
                    <Tag
                      key={a.id}
                      closable
                      onClose={() =>
                        setAnimExterneSel(
                          animExterneSel.filter((x) => x.id !== a.id)
                        )
                      }
                    >
                      {a.nom} {a.prenom} ({a.email})
                    </Tag>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Card>
      </div>

      <Divider />

      {/* Note about participants */}
      <div className="creation-section-box">
        <Card className="creation-info-card">
          <Alert
            message="Participants"
            description="Pour les formations externes, les participants peuvent être des enseignants internes ou externes. Ils ne sont pas gérés dans cette section; ils seront ajoutés via les séances de formation."
            type="warning"
            showIcon
          />
        </Card>
      </div>
    </div>
  );
}
