
import { useState, useMemo } from "react";
// @ts-ignore
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Modal, Button, Steps, Spin, Space, Tooltip } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  PlusCircleOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import "@/styles/pages/calendrier.css";

import FormationWorkflowForm from "@/pages/formation/FormationWorkflowForm";
import { useAllFormations } from "@/hooks/formation";
import EventDetails from "@/pages/presence/EventDetails";
import MailForm from "@/pages/besoin/MailForm";
import DocumentCreateForm from "@/pages/documentFormation/DocumentCreateForm";

const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function CalendrierPage() {
  const { message } = useAppNotification();
  // modal & sélection
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  // wizard: étapes création, docs, mail
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [createdFormation, setCreatedFormation] = useState<any>(null);
  const [docsAdded, setDocsAdded] = useState(false);
  // état calendrier
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");

  const { data: formations = [], isLoading, refetch: refetchFormations } = useAllFormations();

  const steps = [
    { key: "form", title: "Créer la formation" },
    { key: "docs", title: "Ajouter les documents" },
    { key: "mail", title: "Envoyer l'e-mail" },
  ];

  const showAlert = (msg: any, severity = "info") => {
    if (severity === "error") message.error(msg);
    else if (severity === "success") message.success(msg);
    else message.info(msg);
  };

  const events = useMemo(() => {
    let eventsData: any[] = [];
    (Array.isArray(formations) ? formations : []).forEach((f) => {
      if (f.seances?.length) {
          f.seances.forEach((s) => {
            eventsData.push({
              id: s.idSeance,
              title: f.titreFormation,
              start: new Date(`${s.dateSeance}T${s.heureDebut}`),
              end: new Date(`${s.dateSeance}T${s.heureFin}`),
              details: { formation: f, seance: s },
            });
          });
        } else {
          eventsData.push({
            id: f.idFormation,
            title: f.titreFormation,
            start: new Date(`${f.dateDebut}T00:00:00`),
            end: new Date(`${f.dateFin}T23:59:59`),
            details: { formation: f },
          });
        }
      });
    return eventsData;
  }, [formations]);

  const handleSelectSlot = (slotInfo: any) => {
    setSelectedEvent(null);
    setSelectedDate(slotInfo.start);
    setShowModal(true);
    setShowWizard(true);
    setWizardStep(0);
    setCreatedFormation(null);
    setDocsAdded(false);
  };

  const handleSelectEvent = (event: any) => {
    setShowWizard(false);
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowModal(true);
  };

  const handleNavigate = (newDate: any) => setCurrentDate(newDate);
  const handleViewChange = (view: any) => setCurrentView(view);

  const handleClose = () => {
    setShowModal(false);
    setShowWizard(false);
    setWizardStep(0);
    setCreatedFormation(null);
    setSelectedEvent(null);
  };

  const onFormationCreatedWizard = (newFormation: any) => {
    setCreatedFormation(newFormation);
    setWizardStep(1);
    void refetchFormations();
    showAlert("Formation créée, ajoutez des documents", "info");
  };

  const onDocumentCreatedWizard = () => {
    setDocsAdded(true);
    showAlert("Document ajouté", "success");
  };

  const onEmailSent = () => {
    showAlert("E-mail envoyé ! Vous pouvez en envoyer un autre.", "success");
  };

  const getStatusClass = (etat: any) => {
    switch (etat) {
      case "ENREGISTRE": return "cal-event--enregistre";
      case "PLANIFIE":   return "cal-event--planifie";
      case "EN_COURS":   return "cal-event--encours";
      case "ACHEVE":     return "cal-event--acheve";
      case "ANNULE":     return "cal-event--annule";
      default:           return "cal-event--default";
    }
  };

  const eventStyleGetter = (event: any) => {
    const etat = event.details?.formation?.etatFormation;
    return {
      className: getStatusClass(etat),
      style: {
        color: "#fff",
      },
    };
  };

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const planifie = events.filter(e => e.details?.formation?.etatFormation === "PLANIFIE").length;
    const enCours = events.filter(e => e.details?.formation?.etatFormation === "EN_COURS").length;
    const acheve = events.filter(e => e.details?.formation?.etatFormation === "ACHEVE").length;
    return { total, planifie, enCours, acheve };
  }, [events]);

  return (
    <div className="cal-page">
      {/* Hero Banner */}
      <div className="cal-hero">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 className="cal-hero-title">Calendrier des Formations</h2>
              <span className="cal-hero-badge">
                {stats.total}
                <span className="cal-hero-badge-total">séance{stats.total !== 1 ? "s" : ""}</span>
              </span>
            </div>
            <div className="cal-hero-subtitle">Planification et suivi des sessions de formation</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Tooltip title="Créer une nouvelle formation en cliquant sur une date du calendrier">
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                className="cal-btn-create"
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedDate(new Date());
                  setShowModal(true);
                  setShowWizard(true);
                  setWizardStep(0);
                  setCreatedFormation(null);
                  setDocsAdded(false);
                }}
              >
                Nouvelle Formation
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="cal-stats">
        <div className="cal-stat-card cal-stat-card--total">
          <div className="cal-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <AppstoreOutlined />
          </div>
          <div className="cal-stat-label">Total Séances</div>
          <div className="cal-stat-value" style={{ color: "#2563eb" }}>{stats.total}</div>
        </div>
        <div className="cal-stat-card cal-stat-card--planifie">
          <div className="cal-stat-icon" style={{ background: "#cffafe", color: "#06b6d4" }}>
            <ClockCircleOutlined />
          </div>
          <div className="cal-stat-label">Planifiées</div>
          <div className="cal-stat-value" style={{ color: "#06b6d4" }}>{stats.planifie}</div>
        </div>
        <div className="cal-stat-card cal-stat-card--cours">
          <div className="cal-stat-icon" style={{ background: "#d1fae5", color: "#059669" }}>
            <TeamOutlined />
          </div>
          <div className="cal-stat-label">En Cours</div>
          <div className="cal-stat-value" style={{ color: "#059669" }}>{stats.enCours}</div>
        </div>
        <div className="cal-stat-card cal-stat-card--acheve">
          <div className="cal-stat-icon" style={{ background: "#f1f5f9", color: "#475569" }}>
            <CheckCircleOutlined />
          </div>
          <div className="cal-stat-label">Achevées</div>
          <div className="cal-stat-value" style={{ color: "#475569" }}>{stats.acheve}</div>
        </div>
      </div>

      {isLoading && (
        <div className="cal-loading">
          <Spin size="large" />
        </div>
      )}

      {/* Légende des états */}
      <div className="cal-legend">
        <span className="cal-legend-label">Légende :</span>
        <span className="cal-legend-tag cal-legend-tag--enregistre">
          <span className="cal-legend-dot cal-legend-dot--enregistre" />Enregistré
        </span>
        <span className="cal-legend-tag cal-legend-tag--planifie">
          <span className="cal-legend-dot cal-legend-dot--planifie" />Planifié
        </span>
        <span className="cal-legend-tag cal-legend-tag--encours">
          <span className="cal-legend-dot cal-legend-dot--encours" />En cours
        </span>
        <span className="cal-legend-tag cal-legend-tag--acheve">
          <span className="cal-legend-dot cal-legend-dot--acheve" />Achevé
        </span>
        <span className="cal-legend-tag cal-legend-tag--annule">
          <span className="cal-legend-dot cal-legend-dot--annule" />Annulé
        </span>
      </div>

      {/* Calendrier */}
      <div className="cal-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          date={currentDate}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          view={currentView}
          views={["month", "week", "day"]}
          eventPropGetter={eventStyleGetter}
          style={{ height: "100%" }}
          popup
          messages={{
            today: "Aujourd'hui",
            previous: "Précédent",
            next: "Suivant",
            month: "Mois",
            week: "Semaine",
            day: "Jour",
            agenda: "Agenda",
            noEventsInRange: "Aucune formation sur cette période.",
          }}
        />
      </div>

      {/* ========== MODAL ========== */}
      <Modal
        open={showModal}
        onCancel={handleClose}
        className="cal-modal"
        title={(() => {
          if (showWizard) return steps[wizardStep].title;
          if (!selectedEvent) return "Créer une Formation";
          return selectedEvent.details.seance ? "Détails de la Séance" : "Détails de la Formation";
        })()}
        width={680}
        styles={{ body: { maxHeight: "72vh", overflowY: "auto", padding: "16px 24px" } }}
        footer={
          showWizard ? (
            <Space>
              {wizardStep > 0 && (
                <Button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  disabled={isLoading}
                  icon={<LeftOutlined />}
                  className="cal-btn-prev"
                >
                  Précédent
                </Button>
              )}
              {wizardStep < steps.length - 1 && (
                <Button
                  type="primary"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={
                    (wizardStep === 0 && !createdFormation) ||
                    (wizardStep === 1 && !docsAdded) ||
                    isLoading
                  }
                  icon={<RightOutlined />}
                  iconPosition="end"
                  className="cal-btn-next"
                >
                  Suivant
                </Button>
              )}
              {wizardStep === steps.length - 1 && (
                <Button
                  type="primary"
                  onClick={handleClose}
                  disabled={isLoading}
                  icon={<CheckOutlined />}
                  className="cal-btn-finish"
                >
                  Terminer
                </Button>
              )}
              <Button onClick={handleClose} disabled={isLoading} className="cal-btn-cancel">
                Annuler
              </Button>
            </Space>
          ) : (
            <Button onClick={handleClose}>Fermer</Button>
          )
        }
      >
        {(() => {
          if (showWizard) return (
          <>
            <Steps
              current={wizardStep}
              items={steps}
              style={{ marginBottom: 24 }}
            />

            {wizardStep === 0 && (
              <FormationWorkflowForm
                initialDate={selectedDate as any}
                onFormationCreated={onFormationCreatedWizard}
              />
            )}

            {wizardStep === 1 && (
              <DocumentCreateForm
                formationId={createdFormation?.idFormation}
                onDocumentCreated={onDocumentCreatedWizard}
                onCancel={handleClose}
              />
            )}

            {wizardStep === 2 && (
              <MailForm
                formation={createdFormation}
                onSendSuccess={onEmailSent}
              />
            )}
          </>
          );
          if (selectedEvent) return (
          <div style={{ position: "relative" }}>
            {isLoading && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin size="large" />
              </div>
            )}
            <div style={{ opacity: isLoading ? 0.5 : 1 }}>
              <EventDetails {...{selectedEvent} as any} />
            </div>
          </div>
          );
          return (
          <FormationWorkflowForm
            initialDate={selectedDate as any}
            onFormationCreated={onFormationCreatedWizard}
          />
          );
        })()}
      </Modal>
    </div>
  );
}






