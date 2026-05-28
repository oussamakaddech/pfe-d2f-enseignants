import { InfoCircleOutlined, ReadOutlined, CalendarOutlined, DollarOutlined, NodeIndexOutlined } from "@ant-design/icons";
import { Card } from "antd";

import WizardStepper from "@/components/wizard/WizardStepper";
import WizardNavFooter from "@/components/wizard/WizardNavFooter";
import DocumentUploadForm from "../documentFormation/DocumentUploadForm";
import "@/styles/pages/formation-workflow-form.css";

import { useFormationWorkflow, toMinutes, type BesoinInfoShape, type FormationWorkflowFormProps } from "./hooks/useFormationWorkflow";
import GeneralStep from "./steps/GeneralStep";
import PedagogyStep from "./steps/PedagogyStep";
import PlanningStep from "./steps/PlanningStep";
import CompetenciesStep from "./steps/CompetenciesStep";
import CostsStep from "./steps/CostsStep";

export const STEPS = [
  { title: "Général", icon: <InfoCircleOutlined /> },
  { title: "Pédagogie", icon: <ReadOutlined /> },
  { title: "Planning & Acteurs", icon: <CalendarOutlined /> },
  { title: "Compétences RICE", icon: <NodeIndexOutlined /> },
  { title: "Coûts", icon: <DollarOutlined /> },
];

export const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

export type { BesoinInfoShape, FormationWorkflowFormProps };

export default function FormationWorkflowForm({ initialDate, onFormationCreated, besoinInfo }: Readonly<FormationWorkflowFormProps>) {
  const wf = useFormationWorkflow({ initialDate, onFormationCreated, besoinInfo });

  const renderStep = (step: number) => {
    switch (step) {
      case 0: return <GeneralStep besoinInfo={besoinInfo} titre={wf.titre} setTitre={wf.setTitre} typeFormation={wf.typeFormation} setTypeFormation={wf.setTypeFormation} etatFormation={wf.etatFormation} setEtatFormation={wf.setEtatFormation} dateDebut={wf.dateDebut} setDateDebut={wf.setDateDebut} dateFin={wf.dateFin} setDateFin={wf.setDateFin} salle={wf.salle} setSalle={wf.setSalle} periodCode={wf.periodCode} setPeriodCode={wf.setPeriodCode} customPeriodLabel={wf.customPeriodLabel} setCustomPeriodLabel={wf.setCustomPeriodLabel} chargeH={wf.chargeH} setChargeH={wf.setChargeH} seances={wf.seances} toMinutes={toMinutes} ups={wf.ups} depts={wf.depts} selectedUp={wf.selectedUp} setSelectedUp={wf.setSelectedUp} selectedDept={wf.selectedDept} setSelectedDept={wf.setSelectedDept} ouverte={wf.ouverte} setOuverte={wf.setOuverte} />;
      case 1: return <PedagogyStep domaine={wf.domaine} setDomaine={wf.setDomaine} populationCible={wf.populationCible} setPopulationCible={wf.setPopulationCible} objectifs={wf.objectifs} setObjectifs={wf.setObjectifs} objectifsPedago={wf.objectifsPedago} setObjectifsPedago={wf.setObjectifsPedago} evalMethods={wf.evalMethods} setEvalMethods={wf.setEvalMethods} />;
      case 2: return <PlanningStep seances={wf.seances} addSeance={wf.addSeance} updateSeance={wf.updateSeance} removeSeance={wf.removeSeance} toggleSeance={wf.toggleSeance} typeFormation={wf.typeFormation} isAdminUser={wf.isAdminUser} ups={wf.ups} depts={wf.depts} animSel={wf.animSel} setAnimSel={wf.setAnimSel} animFilterUp={wf.animFilterUp} setAnimFilterUp={wf.setAnimFilterUp} animFilterDept={wf.animFilterDept} setAnimFilterDept={wf.setAnimFilterDept} partSel={wf.partSel} setPartSel={wf.setPartSel} partFilterUp={wf.partFilterUp} setPartFilterUp={wf.setPartFilterUp} partFilterDept={wf.partFilterDept} setPartFilterDept={wf.setPartFilterDept} optionsAnim={wf.optionsAnim} optionsPart={wf.optionsPart} overlapWarnings={wf.overlapWarnings} formNom={wf.formNom} setFormNom={wf.setFormNom} formPrenom={wf.formPrenom} setFormPrenom={wf.setFormPrenom} formEmail={wf.formEmail} setFormEmail={wf.setFormEmail} bureauNom={wf.bureauNom} setBureauNom={wf.setBureauNom} bureauMail={wf.bureauMail} setBureauMail={wf.setBureauMail} bureauTelephone={wf.bureauTelephone} setBureauTelephone={wf.setBureauTelephone} getAnimateurLabel={wf.getAnimateurLabel} getEnseignantLabel={wf.getEnseignantLabel} handleExcelImportFile={wf.handleExcelImportFile} exportParticipantsExcel={wf.exportParticipantsExcel} />;
      case 3: return <CompetenciesStep compDomaines={wf.compDomaines} compCompetences={wf.compCompetences} selectedCompLinks={wf.selectedCompLinks} setSelectedCompLinks={wf.setSelectedCompLinks} rowSavoirs={wf.rowSavoirs} compSearch={wf.compSearch} setCompSearch={wf.setCompSearch} handleCompetenceSelect={wf.handleCompetenceSelect} handleSavoirSelect={wf.handleSavoirSelect} handleRemoveCompetenceLink={wf.handleRemoveCompetenceLink} getCompetenceOptions={wf.getCompetenceOptions} />;
      case 4: return <CostsStep typeFormation={wf.typeFormation} organisme={wf.organisme} setOrganisme={wf.setOrganisme} cout={wf.cout} setCout={wf.setCout} coutTransport={wf.coutTransport} setCoutTransport={wf.setCoutTransport} coutHebergement={wf.coutHebergement} setCoutHebergement={wf.setCoutHebergement} coutRepas={wf.coutRepas} setCoutRepas={wf.setCoutRepas} />;
      default: return null;
    }
  };

  return (
    <div className="creation-form">
      <WizardStepper steps={STEPS} activeStep={wf.activeStep} />
      <div className="wf-progress-bar" role="progressbar" aria-valuenow={wf.activeStep + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Étape ${wf.activeStep + 1} sur ${STEPS.length}`}>
        <div className="wf-progress-fill" style={{ width: `${((wf.activeStep + 1) / STEPS.length) * 100}%` }} />
      </div>
      <Card className="creation-step-card">
        <div className="wf-step-header">
          <div className="wf-step-header-icon" aria-hidden="true">{STEPS[wf.activeStep].icon}</div>
          <div className="wf-step-header-text">
            <div className="wf-step-header-title">{STEPS[wf.activeStep].title}</div>
            <div className="wf-step-header-desc">Étape {wf.activeStep + 1} sur {STEPS.length}</div>
          </div>
        </div>
        <div className="creation-step-content">{renderStep(wf.activeStep)}</div>
        <WizardNavFooter activeStep={wf.activeStep} totalSteps={STEPS.length} onBack={wf.handleBack} onNext={wf.handleNext} onSubmit={wf.handleSubmit} />
      </Card>
      {wf.showUpload && wf.newFormationId != null && <DocumentUploadForm formationId={wf.newFormationId} onClose={() => wf.setShowUpload(false)} onDocumentAdded={() => {}} />}
    </div>
  );
}
