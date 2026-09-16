import { useState } from "react";
import {
  Row, Col, Card, Space, Radio, Select, Typography, Alert, Empty, Divider,
  Tag
} from "antd";
import { TeamOutlined } from "@ant-design/icons";
import type { PersonItem, LookupNode } from "../hooks/useFormationWorkflow";
import { AdditionMode, type AnimateurAdditionConfig, type ParticipantAdditionConfig } from "../formationWorkflowTypes";
import AddActorModal, { type ActorDraft, type ActorKind } from "@/components/formation/AddActorModal";
import ActorToolbar from "@/components/formation/ActorToolbar";

const { Text } = Typography;

export interface InternalFormationActorsStepProps {
  ups: LookupNode[];
  depts: LookupNode[];

  // Animateurs
  animSel: PersonItem[];
  setAnimSel: (v: PersonItem[]) => void;
  animateurConfig: AnimateurAdditionConfig | null;
  setAnimateurConfig: (v: AnimateurAdditionConfig | null) => void;
  optionsAnim: PersonItem[];

  // Participants
  partSel: PersonItem[];
  setPartSel: (v: PersonItem[]) => void;
  participantConfig: ParticipantAdditionConfig | null;
  setParticipantConfig: (v: ParticipantAdditionConfig | null) => void;
  optionsPart: PersonItem[];

  // Actions
  addManualAnimateur: (d: ActorDraft) => void;
  addManualParticipant: (d: ActorDraft) => void;
  handleExcelImportAnimateurFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExcelImportParticipantFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectAllVisibleAnim: () => void;
  selectAllVisiblePart: () => void;
  clearAnimSel: () => void;
  clearPartSel: () => void;
}

export default function InternalFormationActorsStep(
  props: Readonly<InternalFormationActorsStepProps>
) {
  const {
    ups, depts,
    animSel, setAnimSel, animateurConfig, setAnimateurConfig, optionsAnim,
    partSel, setPartSel, participantConfig, setParticipantConfig, optionsPart,
    addManualAnimateur, addManualParticipant,
    handleExcelImportAnimateurFile, handleExcelImportParticipantFile,
    selectAllVisibleAnim, selectAllVisiblePart, clearAnimSel, clearPartSel,
  } = props;

  const [animModalOpen, setAnimModalOpen] = useState(false);
  const [partModalOpen, setPartModalOpen] = useState(false);
  const [animMode, setAnimMode] = useState<AdditionMode>(AdditionMode.MANUAL);
  const [partMode, setPartMode] = useState<AdditionMode>(AdditionMode.MANUAL);
  const [selectedAnimDepts, setSelectedAnimDepts] = useState<string[]>([]);
  const [selectedAnimUps, setSelectedAnimUps] = useState<string[]>([]);
  const [selectedPartDepts, setSelectedPartDepts] = useState<string[]>([]);
  const [selectedPartUps, setSelectedPartUps] = useState<string[]>([]);

  const handleAnimModeChange = (mode: AdditionMode) => {
    setAnimMode(mode);
    if (mode === AdditionMode.MANUAL) {
      setAnimateurConfig(null);
    } else {
      setAnimateurConfig({ mode, deptIds: [], upIds: [], manualIds: [] });
    }
  };

  const handlePartModeChange = (mode: AdditionMode) => {
    setPartMode(mode);
    if (mode === AdditionMode.MANUAL) {
      setParticipantConfig(null);
    } else {
      setParticipantConfig({ mode, deptIds: [], upIds: [], manualIds: [] });
    }
  };

  const handleAnimDeptChange = (values: string[]) => {
    setSelectedAnimDepts(values);
    if (animateurConfig && animMode === AdditionMode.AUTO_BY_DEPT) {
      setAnimateurConfig({ ...animateurConfig, deptIds: values });
    }
  };

  const handleAnimUpChange = (values: string[]) => {
    setSelectedAnimUps(values);
    if (animateurConfig && animMode === AdditionMode.AUTO_BY_UP) {
      setAnimateurConfig({ ...animateurConfig, upIds: values });
    }
  };

  const handlePartDeptChange = (values: string[]) => {
    setSelectedPartDepts(values);
    if (participantConfig && partMode === AdditionMode.AUTO_BY_DEPT) {
      setParticipantConfig({ ...participantConfig, deptIds: values });
    }
  };

  const handlePartUpChange = (values: string[]) => {
    setSelectedPartUps(values);
    if (participantConfig && partMode === AdditionMode.AUTO_BY_UP) {
      setParticipantConfig({ ...participantConfig, upIds: values });
    }
  };

  const upOptions = ups.map((u) => ({
    value: u.id,
    label: u.libelle || u.id,
  }));

  const deptOptions = depts.map((d) => ({
    value: d.id,
    label: d.libelle || d.id,
  }));

  return (
    <div>
      {/* Animateurs Section */}
      <div className="creation-section-box">
        <div className="creation-section-box-title">
          <TeamOutlined /> Animateurs internes
        </div>

        <Card className="creation-actor-card">
          <Row gutter={[16, 12]}>
            <Col span={24}>
              <Text strong>Mode d'ajout</Text>
            </Col>
            <Col span={24}>
              <Radio.Group
                value={animMode}
                onChange={(e) => handleAnimModeChange(e.target.value)}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Radio value={AdditionMode.MANUAL}>Sélection manuelle</Radio>
                  <Radio value={AdditionMode.AUTO_BY_DEPT}>Ajouter par département</Radio>
                  <Radio value={AdditionMode.AUTO_BY_UP}>Ajouter par UP</Radio>
                </Space>
              </Radio.Group>
            </Col>
          </Row>

          {animMode === AdditionMode.MANUAL && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les animateurs"
                  value={animSel.map((a) => String(a.id ?? ""))}
                  onChange={(ids) => {
                    const selected = optionsAnim.filter((o) =>
                      ids.includes(String(o.id ?? ""))
                    );
                    setAnimSel(selected);
                  }}
                  options={optionsAnim.map((a) => ({
                    value: String(a.id ?? ""),
                    label: `${a.nom} ${a.prenom} (${a.mail})`,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col span={24}>
                <ActorToolbar
                  variant="primary"
                  count={animSel.length}
                  total={optionsAnim.length}
                  fileInputId="excel-import-anim"
                  onAdd={() => setAnimModalOpen(true)}
                  onSelectAll={selectAllVisibleAnim}
                  onClear={clearAnimSel}
                  onImportExcel={handleExcelImportAnimateurFile}
                  addLabel="Ajouter"
                  selectAllLabel="Tous"
                  clearLabel="Vider"
                  importLabel="Import Excel"
                />
                <input
                  id="excel-import-anim"
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleExcelImportAnimateurFile}
                />
              </Col>
            </Row>
          )}

          {animMode === AdditionMode.AUTO_BY_DEPT && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text>Sélectionnez les départements</Text>
              </Col>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les départements"
                  value={selectedAnimDepts}
                  onChange={handleAnimDeptChange}
                  options={deptOptions}
                  style={{ width: "100%" }}
                />
              </Col>
              {selectedAnimDepts.length > 0 && (
                <Col span={24}>
                  <Alert
                    message={`${optionsAnim.filter((a) => a.deptLibelle && selectedAnimDepts.includes(a.deptLibelle)).length} animateurs trouvés`}
                    type="info"
                    showIcon
                  />
                </Col>
              )}
            </Row>
          )}

          {animMode === AdditionMode.AUTO_BY_UP && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text>Sélectionnez les UPs</Text>
              </Col>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les UPs"
                  value={selectedAnimUps}
                  onChange={handleAnimUpChange}
                  options={upOptions}
                  style={{ width: "100%" }}
                />
              </Col>
              {selectedAnimUps.length > 0 && (
                <Col span={24}>
                  <Alert
                    message={`${optionsAnim.filter((a) => a.upLibelle && selectedAnimUps.includes(a.upLibelle)).length} animateurs trouvés`}
                    type="info"
                    showIcon
                  />
                </Col>
              )}
            </Row>
          )}

          <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Text strong>Animateurs sélectionnés ({animSel.length})</Text>
            </Col>
            <Col span={24}>
              {animSel.length === 0 ? (
                <Empty description="Aucun animateur sélectionné" />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {animSel.map((a) => (
                    <Tag
                      key={String(a.id ?? "")}
                      closable
                      onClose={() =>
                        setAnimSel(animSel.filter((x) => x.id !== a.id))
                      }
                    >
                      {a.nom} {a.prenom}
                    </Tag>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Card>
      </div>

      <Divider />

      {/* Participants Section */}
      <div className="creation-section-box">
        <div className="creation-section-box-title">
          <TeamOutlined /> Participants internes
        </div>

        <Card className="creation-actor-card">
          <Row gutter={[16, 12]}>
            <Col span={24}>
              <Text strong>Mode d'ajout</Text>
            </Col>
            <Col span={24}>
              <Radio.Group
                value={partMode}
                onChange={(e) => handlePartModeChange(e.target.value)}
                style={{ width: "100%" }}
              >
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Radio value={AdditionMode.MANUAL}>Sélection manuelle</Radio>
                  <Radio value={AdditionMode.AUTO_BY_DEPT}>Ajouter par département</Radio>
                  <Radio value={AdditionMode.AUTO_BY_UP}>Ajouter par UP</Radio>
                </Space>
              </Radio.Group>
            </Col>
          </Row>

          {partMode === AdditionMode.MANUAL && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les participants"
                  value={partSel.map((p) => String(p.id ?? ""))}
                  onChange={(ids) => {
                    const selected = optionsPart.filter((o) =>
                      ids.includes(String(o.id ?? ""))
                    );
                    setPartSel(selected);
                  }}
                  options={optionsPart.map((p) => ({
                    value: String(p.id ?? ""),
                    label: `${p.nom} ${p.prenom} (${p.mail})`,
                  }))}
                  style={{ width: "100%" }}
                />
              </Col>
              <Col span={24}>
                <ActorToolbar
                  variant="primary"
                  count={partSel.length}
                  total={optionsPart.length}
                  fileInputId="excel-import-part"
                  onAdd={() => setPartModalOpen(true)}
                  onSelectAll={selectAllVisiblePart}
                  onClear={clearPartSel}
                  onImportExcel={handleExcelImportParticipantFile}
                  addLabel="Ajouter"
                  selectAllLabel="Tous"
                  clearLabel="Vider"
                  importLabel="Import Excel"
                />
                <input
                  id="excel-import-part"
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleExcelImportParticipantFile}
                />
              </Col>
            </Row>
          )}

          {partMode === AdditionMode.AUTO_BY_DEPT && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text>Sélectionnez les départements</Text>
              </Col>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les départements"
                  value={selectedPartDepts}
                  onChange={handlePartDeptChange}
                  options={deptOptions}
                  style={{ width: "100%" }}
                />
              </Col>
              {selectedPartDepts.length > 0 && (
                <Col span={24}>
                  <Alert
                    message={`${optionsPart.filter((p) => p.deptLibelle && selectedPartDepts.includes(p.deptLibelle)).length} participants trouvés`}
                    type="info"
                    showIcon
                  />
                </Col>
              )}
            </Row>
          )}

          {partMode === AdditionMode.AUTO_BY_UP && (
            <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text>Sélectionnez les UPs</Text>
              </Col>
              <Col span={24}>
                <Select
                  mode="multiple"
                  placeholder="Sélectionnez les UPs"
                  value={selectedPartUps}
                  onChange={handlePartUpChange}
                  options={upOptions}
                  style={{ width: "100%" }}
                />
              </Col>
              {selectedPartUps.length > 0 && (
                <Col span={24}>
                  <Alert
                    message={`${optionsPart.filter((p) => p.upLibelle && selectedPartUps.includes(p.upLibelle)).length} participants trouvés`}
                    type="info"
                    showIcon
                  />
                </Col>
              )}
            </Row>
          )}

          <Row gutter={[16, 12]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Text strong>Participants sélectionnés ({partSel.length})</Text>
            </Col>
            <Col span={24}>
              {partSel.length === 0 ? (
                <Empty description="Aucun participant sélectionné" />
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {partSel.map((p) => (
                    <Tag
                      key={String(p.id ?? "")}
                      closable
                      onClose={() =>
                        setPartSel(partSel.filter((x) => x.id !== p.id))
                      }
                    >
                      {p.nom} {p.prenom}
                    </Tag>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Card>
      </div>

      {/* Modals for manual addition */}
      <AddActorModal
        open={animModalOpen}
        kind={"ANIMATEUR" satisfies ActorKind}
        onCancel={() => setAnimModalOpen(false)}
        onSubmit={(d) => { addManualAnimateur(d); setAnimModalOpen(false); }}
      />
      <AddActorModal
        open={partModalOpen}
        kind={"PARTICIPANT" satisfies ActorKind}
        onCancel={() => setPartModalOpen(false)}
        onSubmit={(d) => { addManualParticipant(d); setPartModalOpen(false); }}
      />
    </div>
  );
}
