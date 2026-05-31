import { Button, Col, Input, Modal, Row, Typography } from "antd";
import { DownOutlined, SaveOutlined, UpOutlined } from "@ant-design/icons";
import { useFormationWorkflow } from "@/hooks/formation/useFormationWorkflow";
import DocumentListModal from "../documentFormation/DocumentListModal";
import DocumentUploadPanel from "../documentFormation/DocumentUploadPanel";
import FormationGeneralSection  from "./components/FormationGeneralSection";
import FormationSeancesSection  from "./components/FormationSeancesSection";
import type { FormationEdit } from "./formationWorkflowTypes";
import "@/styles/pages/formation-workflow-edit-form.css";

const { Text } = Typography;

interface FormationWorkflowEditFormProps {
  formation: FormationEdit;
  onFormationUpdated: (res: Record<string, unknown>) => void;
}

export default function FormationWorkflowEditForm({ formation, onFormationUpdated }: FormationWorkflowEditFormProps) {
  const h = useFormationWorkflow(formation, onFormationUpdated);

  return (
    <form onSubmit={h.handleSubmit} className="workflow-edit-page">

      <FormationGeneralSection
        titre={h.titre} setTitre={h.setTitre}
        dateDebut={h.dateDebut} setDateDebut={h.setDateDebut}
        dateFin={h.dateFin} setDateFin={h.setDateFin}
        typeFormation={h.typeFormation} setTypeFormation={h.setTypeFormation}
        etatFormation={h.etatFormation} setEtatFormation={h.setEtatFormation}
        cout={h.cout} setCout={h.setCout}
        organisme={h.organisme} setOrganisme={h.setOrganisme}
        chargeH={h.chargeH} setChargeH={h.setChargeH}
        formNom={h.formNom} setFormNom={h.setFormNom}
        formPrenom={h.formPrenom} setFormPrenom={h.setFormPrenom}
        formEmail={h.formEmail} setFormEmail={h.setFormEmail}
        coutTransport={h.coutTransport} setCoutTransport={h.setCoutTransport}
        coutHebergement={h.coutHebergement} setCoutHebergement={h.setCoutHebergement}
        coutRepas={h.coutRepas} setCoutRepas={h.setCoutRepas}
        selectedUp={h.selectedUp} setSelectedUp={h.setSelectedUp}
        selectedDept={h.selectedDept} setSelectedDept={h.setSelectedDept}
        ups={h.ups} depts={h.depts}
        ouverte={h.ouverte} setOuverte={h.setOuverte}
        periodCode={h.periodCode} setPeriodCode={h.setPeriodCode}
        customPeriodLabel={h.customPeriodLabel} setCustomPeriodLabel={h.setCustomPeriodLabel}
        isResponsableDossier={h.isResponsableDossier}
      />

      {/* ── Informations complémentaires ──────────────────────────────────── */}
      <div className="workflow-edit-section">
        <div className="workflow-edit-section-title">Informations complémentaires</div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Button icon={h.showMore ? <UpOutlined /> : <DownOutlined />} onClick={() => h.setShowMore((m) => !m)}>
              {h.showMore ? "Moins d'infos" : "Plus d'infos"}
            </Button>
            {h.showMore && (
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                {([
                  ["Domaine",       h.domaine,          h.setDomaine],
                  ["Pop. Cible",    h.populationCible,  h.setPopulationCible],
                  ["Objectifs",     h.objectifs,        h.setObjectifs],
                  ["Obj. Pédago",   h.objectifsPedago,  h.setObjectifsPedago],
                  ["Eval Methods",  h.evalMethods,      h.setEvalMethods],
                  ["Prérequis",     h.prerequis,        h.setPrerequis],
                  ["Acquis",        h.acquis,           h.setAcquis],
                  ["Indicateurs",   h.indicateurs,      h.setIndicateurs],
                ] as [string, string, (v: string) => void][]).map(([lbl, val, setVal]) => (
                  <Col xs={24} sm={12} key={lbl}>
                    <Text type="secondary">{lbl}</Text>
                    <Input value={val} onChange={(e) => setVal(e.target.value)} />
                  </Col>
                ))}
              </Row>
            )}
          </Col>
        </Row>
      </div>

      <FormationSeancesSection
        seances={h.seances}
        addSeance={h.addSeance}
        updateSeance={h.updateSeance}
        removeSeance={h.removeSeance}
        toggleSeance={h.toggleSeance}
        overlapWarnings={h.overlapWarnings}
        typeFormation={h.typeFormation}
        optionsAnim={h.optionsAnim}
        optionsPart={h.optionsPart}
        getEnseignantLabel={h.getEnseignantLabel}
        animSel={h.animSel}
        setAnimSel={h.setAnimSel}
        partSel={h.partSel}
        setPartSel={h.setPartSel}
        partFilterUp={h.partFilterUp}
        setPartFilterUp={h.setPartFilterUp}
        partFilterDept={h.partFilterDept}
        setPartFilterDept={h.setPartFilterDept}
        ups={h.ups}
        depts={h.depts}
        handleFile={h.handleFile}
        onOpenUpload={() => h.setOpenUploadPanel(true)}
        onOpenDocModal={() => h.setOpenDocModal(true)}
      />

      {!h.isResponsableDossier && (
        <div className="workflow-edit-footer">
          <div />
          <div className="workflow-edit-footer-right">
            <Button type="primary" danger htmlType="submit" icon={<SaveOutlined />} size="large">
              Mettre à jour
            </Button>
          </div>
        </div>
      )}

      <Modal open={h.openUploadPanel} onCancel={() => h.setOpenUploadPanel(false)} title="Ajouter au dossier" width={600} footer={null}>
        <DocumentUploadPanel
          formationId={formation.idFormation}
          onDocumentAdded={() => { h.setOpenUploadPanel(false); }}
          onClose={() => h.setOpenUploadPanel(false)}
        />
      </Modal>

      <DocumentListModal
        open={h.openDocModal}
        formation={formation}
        onClose={() => h.setOpenDocModal(false)}
        onDocumentsUpdated={() => undefined}
      />
    </form>
  );
}
