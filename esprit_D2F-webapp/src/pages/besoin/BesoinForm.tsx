/* ─────────────────────────────────────────────────────────────────────────
 * BesoinForm — Wizard shell (thin orchestrator, ≤ 200 lines)
 * State & logic: useBesoinForm | Step UI: ./steps/
 * ─────────────────────────────────────────────────────────────────────── */
import { Form, Button, Typography, Spin, Result, Breadcrumb, Progress } from "antd";
import {
  SaveOutlined, ApartmentOutlined, AimOutlined, ClockCircleOutlined,
  CheckCircleOutlined, ArrowLeftOutlined, ArrowRightOutlined, HomeOutlined,
  EditOutlined, NodeIndexOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

import { useBesoinForm } from "./hooks/useBesoinForm";
import BesoinInfoStep        from "./steps/BesoinInfoStep";
import BesoinFormationStep   from "./steps/BesoinFormationStep";
import BesoinDetailsStep     from "./steps/BesoinDetailsStep";
import BesoinCompetencesStep from "./steps/BesoinCompetencesStep";
import BesoinParametresStep  from "./steps/BesoinParametresStep";
import BesoinReviewStep, { buildSummarySections } from "./steps/BesoinReviewStep";

import "@/styles/pages/besoin-tokens.css";
import "@/styles/pages/besoin-form.css";

const { Text } = Typography;

const STEPS_META = [
  { key: "contexte",    title: "Contexte",    subtitle: "UP, département & type",       icon: <ApartmentOutlined /> },
  { key: "formation",   title: "Formation",   subtitle: "Titre & objectifs",            icon: <AimOutlined /> },
  { key: "details",     title: "Détails",     subtitle: "Formateur, horaire & période", icon: <ClockCircleOutlined /> },
  { key: "competences", title: "Compétences", subtitle: "Référentiel RICE",             icon: <NodeIndexOutlined /> },
  { key: "parametres",  title: "Paramètres",  subtitle: "Type & évaluation",            icon: <CheckCircleOutlined /> },
];

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d < 0 ? 40 : -40, opacity: 0 }),
};

export default function BesoinForm() {
  const ctx = useBesoinForm();

  if (ctx.loading) {
    return (
      <div className="bf-scope bf-form-page bf-form-page--loading">
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: 16 }}>Chargement...</Text>
      </div>
    );
  }

  if (ctx.submitted) {
    return (
      <div className="bf-scope bf-form-page">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div className="bf-form-shell">
            <Result
              status="success"
              icon={<div className="bf-success-icon"><CheckCircleOutlined /></div>}
              title="Besoin enregistré avec succès"
              subTitle="Votre demande de formation a été transmise et sera examinée prochainement par le CUP."
              extra={[
                <Button type="primary" key="list" size="large" className="bf-btn bf-btn--primary" onClick={() => { globalThis.location.href = "/home/besoins"; }}>
                  Voir la liste des besoins
                </Button>,
                <Button key="again" size="large" className="bf-btn bf-btn--ghost" onClick={() => { ctx.setSubmitted(false); ctx.form.resetFields(); ctx.setCurrentStep(0); }}>
                  Ajouter un autre besoin
                </Button>,
              ]}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  const isSummary = ctx.currentStep >= STEPS_META.length;
  const progressPercent = isSummary ? 100 : Math.round(((ctx.currentStep + 1) / (STEPS_META.length + 1)) * 100);
  const progressStep = isSummary ? STEPS_META.length : ctx.currentStep + 1;
  const formatProgress = () => <span className="bf-form-header__progress-text">{progressStep}/<small>{STEPS_META.length}</small></span>;

  const stepContent = [
    <BesoinInfoStep
      key="contexte"
      ups={ctx.ups as any}
      departements={ctx.departements as any}
      canManageParticipants={ctx.canManageParticipants}
      participantsCount={ctx.participantsCount}
      lastImportCount={ctx.lastImportCount}
      participantsFileInputRef={ctx.participantsFileInputRef as any}
      onImportExcel={ctx.importParticipantsFromExcel}
      onClearParticipants={ctx.clearParticipants}
    />,
    <BesoinFormationStep key="formation" />,
    <BesoinDetailsStep   key="details" />,
    <BesoinCompetencesStep
      key="competences"
      compLoaded={ctx.compLoaded}
      compDomaines={ctx.compDomaines}
      compCompetences={ctx.compCompetences}
      selectedCompLinks={ctx.selectedCompLinks}
      setSelectedCompLinks={ctx.setSelectedCompLinks}
      rowSavoirs={ctx.rowSavoirs}
      setRowSavoirs={ctx.setRowSavoirs}
      compSearch={ctx.compSearch}
      setCompSearch={ctx.setCompSearch}
      onCompetenceChange={ctx.handleCompetenceChange}
    />,
    <BesoinParametresStep key="parametres" />,
  ];

  const summarySections = isSummary
    ? buildSummarySections(
        ctx.form.getFieldsValue(true) as Record<string, unknown>,
        ctx.ups as any,
        ctx.departements as any,
        ctx.selectedCompLinks,
        ctx.canManageParticipants,
        ctx.formatParticipantsSummary,
      )
    : [];

  return (
    <div className="bf-scope bf-form-page">
      <header className="bf-form-header">
        <Breadcrumb className="bf-breadcrumb" items={[
          { href: "/home", title: <><HomeOutlined /> Accueil</> },
          { href: "/home/besoins", title: "Besoins de Formation" },
          { title: <strong>Ajouter un besoin</strong> },
        ]} />
        <div className="bf-form-header__row">
          <div className="bf-form-header__title-block">
            <h1 className="bf-form-header__title">Nouveau besoin de formation</h1>
            <p className="bf-form-header__subtitle">Décrivez votre besoin en quelques étapes — il sera transmis au CUP pour instruction.</p>
          </div>
          <div className="bf-form-header__progress">
            <Progress type="circle" percent={progressPercent} size={56} strokeColor={{ "0%": "#B51200", "100%": "#9a0f00" }} strokeWidth={8} format={formatProgress} />
          </div>
        </div>
      </header>

      <nav className="bf-stepper" aria-label="Étapes du formulaire">
        {STEPS_META.map((s, idx) => {
          const state = idx < ctx.currentStep ? "done" : idx === ctx.currentStep ? "active" : "pending";
          return (
            <button key={s.key} type="button" className={`bf-stepper__item bf-stepper__item--${state}`} onClick={() => idx <= ctx.currentStep && ctx.setCurrentStep(idx)} disabled={idx > ctx.currentStep} aria-current={idx === ctx.currentStep ? "step" : undefined}>
              <span className="bf-stepper__bubble">{state === "done" ? <CheckCircleOutlined /> : <span>{idx + 1}</span>}</span>
              <span className="bf-stepper__text"><span className="bf-stepper__title">{s.title}</span><span className="bf-stepper__sub">{s.subtitle}</span></span>
            </button>
          );
        })}
      </nav>

      <div className="bf-form-shell">
        <Form form={ctx.form} layout="vertical" onFinish={ctx.handleSubmit} autoComplete="off" preserve={true} className="bf-form">
          <AnimatePresence mode="wait" custom={ctx.direction}>
            {isSummary ? (
              <motion.div key="summary" custom={ctx.direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                <BesoinReviewStep
                  sections={summarySections}
                  onEditSection={(idx) => { ctx.setDirection(-1); ctx.setCurrentStep(idx); }}
                />
              </motion.div>
            ) : (
              <motion.div key={`step-${ctx.currentStep}`} custom={ctx.direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                {stepContent[ctx.currentStep]}
              </motion.div>
            )}
          </AnimatePresence>
        </Form>
      </div>

      <section className="bf-nav-bar" aria-label="Navigation du formulaire">
        <div className="bf-nav-bar__progress">
          <span className="bf-nav-bar__step-label">
            Étape {isSummary ? STEPS_META.length : ctx.currentStep + 1} sur {STEPS_META.length}
            {isSummary && <span className="bf-nav-bar__step-tag">Récapitulatif</span>}
          </span>
          <div className="bf-nav-bar__progress-track">
            <div className="bf-nav-bar__progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="bf-nav-bar__actions">
          {ctx.currentStep > 0 && (
            <Button size="large" icon={<ArrowLeftOutlined />} onClick={ctx.prev} className="bf-btn bf-btn--ghost">Précédent</Button>
          )}
          {ctx.currentStep < STEPS_META.length - 1 && (
            <Button type="primary" size="large" onClick={ctx.next} className="bf-btn bf-btn--primary">Suivant <ArrowRightOutlined /></Button>
          )}
          {ctx.currentStep === STEPS_META.length - 1 && (
            <Button type="primary" size="large" onClick={ctx.next} className="bf-btn bf-btn--primary">Voir le récapitulatif <ArrowRightOutlined /></Button>
          )}
          {isSummary && (
            <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={ctx.submitting} onClick={ctx.handleSubmit} className="bf-btn bf-btn--success">
              Enregistrer le besoin
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
