// src/pages/Enseignant/CalendarEnseignant.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Divider,
  Grid,
  Stack,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../index.css"; // pour l'animation blink-animateur

const localizer = momentLocalizer(moment);

export default function CalendarEnseignant() {
  const { enseignantId } = useParams();
  const navigate = useNavigate();
  // état du calendrier contrôlé
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");

  const [events, setEvents] = useState([]);
  const [enseignantInfo, setEnseignantInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const dto = await FormationWorkflowService.getFormationsForCalendar(
          enseignantId
        );
        // récupérer l'objet enseignant pour l'en-tête
        const enseignant =
          dto.asAnimateur.flatMap(f => f.seances)
            .find(s => s.animateurs.some(e => e.id === enseignantId))
            ?.animateurs.find(e => e.id === enseignantId)
          ||
          dto.asParticipant.flatMap(f => f.seances)
            .find(s => s.participants.some(e => e.id === enseignantId))
            ?.participants.find(e => e.id === enseignantId);

        setEnseignantInfo(enseignant);

        // construire les events
        const animateurEvents = dto.asAnimateur.flatMap(f =>
          f.seances
            .filter(s => s.animateurs.some(e => e.id === enseignantId))
            .map(s => ({
              id: `A-${f.idFormation}-${s.idSeance}`,
              title: f.titreFormation,
              start: new Date(`${s.dateSeance}T${s.heureDebut}`),
              end:   new Date(`${s.dateSeance}T${s.heureFin}`),
              allDay: false,
              resource: { role: "animateur", formation: f, seance: s },
            }))
        );
        const participantEvents = dto.asParticipant.flatMap(f =>
          f.seances
            .filter(s => s.participants.some(e => e.id === enseignantId))
            .map(s => ({
              id: `P-${f.idFormation}-${s.idSeance}`,
              title: f.titreFormation,
              start: new Date(`${s.dateSeance}T${s.heureDebut}`),
              end:   new Date(`${s.dateSeance}T${s.heureFin}`),
              allDay: false,
              resource: { role: "participant", formation: f, seance: s },
            }))
        );
        setEvents([...animateurEvents, ...participantEvents]);
      } catch (err) {
        console.error("Erreur chargement du calendrier :", err);
      }
    }
    fetchEvents();
  }, [enseignantId]);

  // style + blink pour animateur
  const eventStyleGetter = event => ({
    style: {
      backgroundColor:
        event.resource.role === "animateur" ? "#FFCDD2" : "#BBDEFB",
      borderRadius: 4,
      border: "1px solid #888",
      color: "#333",
      padding: "2px",
    },
    className: event.resource.role === "animateur" ? "blink-animateur" : "",
  });

  const handleSelectEvent = event => {
    setSelectedEvent(event);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setSelectedEvent(null);
  };

  // helper pour format YYYY-MM-DD
  const formatDateInput = d => moment(d).format("YYYY-MM-DD");

  return (
    <>
      <Box sx={{ p: 2 }}>
        {/* bouton retour */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Retour
        </Button>

        {/* titre + datepicker */}
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Typography variant="h4">
            Calendrier de{" "}
            <Box component="span" color="primary.main">
              {enseignantInfo
                ? `${enseignantInfo.nom} ${enseignantInfo.prenom}`
                : enseignantId}
            </Box>
          </Typography>
          {/* sélecteur de date */}
          <TextField
            label="Aller à la date"
            type="date"
            size="small"
            value={formatDateInput(date)}
            onChange={e => setDate(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {/* calendrier contrôlé avec toolbar */}
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={date}
          view={view}
          onNavigate={newDate => setDate(newDate)}
          onView={newView => setView(newView)}
          toolbar
          defaultView="month"
          views={["month", "week", "day"]}
          style={{ height: "75vh" }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
        />
      </Box>

      {/* popup détaillée */}
      {selectedEvent && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
          <DialogTitle>
            <Typography variant="h6" color="error">
              {selectedEvent.resource.role === "animateur"
                ? "Animateur"
                : "Participant"}{" "}
              – {selectedEvent.resource.formation.titreFormation}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              {/* en‐tête enseignant */}
              <Typography>
                <strong>Enseignant :</strong>{" "}
                <Box component="span" color="secondary.main">
                  {enseignantInfo.nom} {enseignantInfo.prenom}
                </Box>{" "}
                — <em>
                  {enseignantInfo.deptLibelle || "Dépt. inconnu"} /{" "}
                  {enseignantInfo.upLibelle || "UP inconnue"}
                </em>
              </Typography>
              <Divider />

              {/* détails séance */}
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Date :</strong>{" "}
                    {selectedEvent.resource.seance.dateSeance}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography>
                    <strong>Début :</strong>{" "}
                    {selectedEvent.resource.seance.heureDebut}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography>
                    <strong>Fin :</strong>{" "}
                    {selectedEvent.resource.seance.heureFin}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Salle :</strong>{" "}
                    {selectedEvent.resource.seance.salle || "—"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>Type :</strong>{" "}
                    <Box component="span" color="error">
                      {selectedEvent.resource.formation.typeFormation}
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>État :</strong>{" "}
                    <Box component="span" color="error">
                      {selectedEvent.resource.formation.etatFormation}
                    </Box>
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography>
                    <strong>Charge horaire :</strong>{" "}
                    {selectedEvent.resource.formation.chargeHoraireGlobal} h
                  </Typography>
                </Grid>
              </Grid>

              <Divider />

              {/* liste des participants ou animateurs */}
              <Box>
                <Typography variant="subtitle1">
                  {selectedEvent.resource.role === "animateur"
                    ? "Participants :"
                    : "Animateurs :"}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
                  {(selectedEvent.resource.role === "animateur"
                    ? selectedEvent.resource.formation.seances.find(
                        s =>
                          s.idSeance ===
                          selectedEvent.resource.seance.idSeance
                      ).participants
                    : selectedEvent.resource.formation.seances.find(
                        s =>
                          s.idSeance ===
                          selectedEvent.resource.seance.idSeance
                      ).animateurs
                  ).map(p => (
                    <Box
                      key={p.id}
                      sx={{
                        px: 1,
                        py: 0.5,
                        bgcolor: "#f5f5f5",
                        borderRadius: 1,
                        border: "1px solid #ddd",
                      }}
                    >
                      {p.nom} {p.prenom}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} variant="outlined" color="secondary">
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
