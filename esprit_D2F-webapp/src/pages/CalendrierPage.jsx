// src/pages/CalendrierPage.jsx

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { Steps } from "antd";
import "antd/dist/reset.css";

import FormationWorkflowForm from "./FormationWorkflowForm";
import FormationWorkflowService from "../services/FormationWorkflowService";
import EventDetails from "./EventDetails";
import SeanceService from "../services/SeanceService";
import MailForm from "./MailForm";
import DocumentCreateForm from "./documentFormation/DocumentCreateForm";

const localizer = momentLocalizer(moment);

export default function CalendrierPage() {
  // données calendrier
  const [events, setEvents] = useState([]);
  // modal & sélection
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  // wizard: étapes création, docs, mail
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [createdFormation, setCreatedFormation] = useState(null);
  const [docsAdded, setDocsAdded] = useState(false);
  // état calendrier
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState("month");
  // alert Snackbar
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");
  // loading
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { key: "form", title: "Créer la formation" },
    { key: "docs", title: "Ajouter les documents" },
    { key: "mail", title: "Envoyer l'e-mail" },
  ];

  useEffect(() => {
    loadFormations();
  }, []);

  const showAlert = (message, severity = "info") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const loadFormations = async () => {
    setIsLoading(true);
    try {
      const data =
        await FormationWorkflowService.getAllFormationWorkflows();
      const formations = Array.isArray(data) ? data : data ? [data] : [];
      const eventsData = [];

      formations.forEach((f) => {
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

      setEvents(eventsData);
      showAlert("Formations chargées avec succès !", "success");
    } catch (err) {
      console.error("❌ Erreur chargement formations:", err);
      showAlert("Erreur lors du chargement des formations", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedEvent(null);
    setSelectedDate(slotInfo.start);
    setShowModal(true);
    setShowWizard(true);
    setWizardStep(0);
    setCreatedFormation(null);
    setDocsAdded(false);
  };

  const handleSelectEvent = (event) => {
    setShowWizard(false);
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowModal(true);
  };

  const handleNavigate = (newDate) => setCurrentDate(newDate);
  const handleViewChange = (view) => setCurrentView(view);

  const handleClose = () => {
    setShowModal(false);
    setShowWizard(false);
    setWizardStep(0);
    setCreatedFormation(null);
    setSelectedEvent(null);
  };

  const onFormationCreatedWizard = (newFormation) => {
    setCreatedFormation(newFormation);
    setWizardStep(1);
    loadFormations();
    showAlert("Formation créée, ajoutez des documents", "info");
  };

  const onDocumentCreatedWizard = () => {
    setDocsAdded(true);
    showAlert("Document ajouté", "success");
  };

  const onEmailSent = () => {
    showAlert("E-mail envoyé ! Vous pouvez en envoyer un autre.", "success");
  };

  const eventStyleGetter = (event) => {
    let bg = "#3174ad";
    const etat = event.details?.formation?.etatFormation;

    switch (etat) {
      case "ENREGISTRE":
        bg = "#f0ad4e";
        break;
      case "PLANIFIE":
        bg = "#5bc0de";
        break;
      case "EN_COURS":
        bg = "#5cb85c";
        break;
      case "ACHEVE":
        bg = "#777";
        break;
      case "ANNULE":
        bg = "#d9534f";
        break;
      default:
        bg = "#3174ad";
    }

    return {
      style: {
        backgroundColor: bg,
        color: "#fff",
        opacity: 0.85,
        border: "1px solid #333",
        borderRadius: "4px",
      },
    };
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📅 Calendrier des Formations</h2>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <div style={{ height: 600, marginTop: 20, marginBottom: 20 }}>
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
        />
      </div>

      {/* ========== MODAL ========== */}
      <Dialog open={showModal} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {showWizard
            ? steps[wizardStep].title
            : selectedEvent
            ? selectedEvent.details.seance
              ? "📝 Détails de la Séance"
              : "📝 Détails de la Formation"
            : "➕ Créer une Formation"}
        </DialogTitle>

        <DialogContent dividers>
          {showWizard ? (
            <>
              <Steps
                current={wizardStep}
                items={steps}
                style={{ marginBottom: 24 }}
              />

              {wizardStep === 0 && (
                <FormationWorkflowForm
                  initialDate={selectedDate}
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
          ) : selectedEvent ? (
            <Box position="relative">
              {isLoading && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000,
                  }}
                >
                  <CircularProgress />
                </Box>
              )}

              <Box sx={{ opacity: isLoading ? 0.5 : 1 }}>
                {/* ✅ EventDetails en affichage uniquement */}
                <EventDetails selectedEvent={selectedEvent} />
              </Box>
            </Box>
          ) : (
            <FormationWorkflowForm
              initialDate={selectedDate}
              onFormationCreated={onFormationCreatedWizard}
            />
          )}
        </DialogContent>

        {/* ========== ACTIONS ========== */}
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {showWizard ? (
            <>
              {wizardStep > 0 && (
                <Button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  disabled={isLoading}
                >
                  ⬅️ Précédent
                </Button>
              )}
              {wizardStep < steps.length - 1 && (
                <Button
                  color="primary"
                  variant="contained"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={
                    (wizardStep === 0 && !createdFormation) ||
                    (wizardStep === 1 && !docsAdded) ||
                    isLoading
                  }
                >
                  ➡️ Suivant
                </Button>
              )}
              {wizardStep === steps.length - 1 && (
                <Button
                  color="success"
                  variant="contained"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  ✅ Terminer
                </Button>
              )}
              <Button onClick={handleClose} disabled={isLoading}>
                Annuler
              </Button>
            </>
          ) : selectedEvent ? (
            <>
              <Button onClick={handleClose}>Fermer</Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ========== SNACKBAR ========== */}
      <Snackbar
        open={alertOpen}
        autoHideDuration={alertSeverity === "error" ? 6000 : 4000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 3000 }}
      >
        <Alert severity={alertSeverity} onClose={() => setAlertOpen(false)}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
