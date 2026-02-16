// src/components/EventDetails.jsx

import PropTypes from "prop-types";
import moment from "moment";
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Grid,
  Chip,
  Typography,
  Box,
  Divider,
  Avatar,
  Stack,
} from "@mui/material";

// ✅ Imports corrects - chemin direct
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RoomIcon from "@mui/icons-material/Room";
import PersonIcon from "@mui/icons-material/Person";
import InfoIcon from "@mui/icons-material/Info";
import EventNoteIcon from "@mui/icons-material/EventNote";

const EventDetails = ({
  selectedEvent,
  editedDateSeance,
  setEditedDateSeance,
  editedHeureDebut,
  setEditedHeureDebut,
  editedHeureFin,
  setEditedHeureFin,
  editedSalle,
  setEditedSalle,
  editedParticipants,
  setEditedParticipants,
}) => {
  if (!selectedEvent?.details) return null;

  const { formation, seance } = selectedEvent.details;
  const hasSeance = !!seance;

  const getEtatBadgeColor = (etat) => {
    const colors = {
      ENREGISTRE: "warning",
      PLANIFIE: "info",
      EN_COURS: "success",
      ACHEVE: "default",
      ANNULE: "error",
    };
    return colors[etat] || "default";
  };

  return (
    <Box sx={{ maxWidth: 900, margin: "0 auto" }}>
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: "#1976d2" }}>
              <EventNoteIcon />
            </Avatar>
          }
          title="📌 Informations sur la Formation"
          titleTypographyProps={{ variant: "h6", fontWeight: "bold" }}
          sx={{ bgcolor: "#f5f5f5" }}
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Formation"
                fullWidth
                value={formation?.titreFormation || ""}
                InputProps={{ readOnly: true }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Type"
                fullWidth
                value={formation?.typeFormation || "N/A"}
                InputProps={{ readOnly: true }}
                variant="outlined"
                size="small"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Début"
                fullWidth
                value={
                  formation?.dateDebut
                    ? moment(formation.dateDebut).format("DD/MM/YYYY")
                    : ""
                }
                InputProps={{ readOnly: true }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fin"
                fullWidth
                value={
                  formation?.dateFin
                    ? moment(formation.dateFin).format("DD/MM/YYYY")
                    : ""
                }
                InputProps={{ readOnly: true }}
                variant="outlined"
                size="small"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Organisme"
                fullWidth
                value={formation?.organismeRefExterne || "N/A"}
                InputProps={{ readOnly: true }}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ pt: 1 }}>
                <Typography variant="caption" sx={{ color: "#666" }}>
                  État
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={formation?.etatFormation || "N/A"}
                    color={getEtatBadgeColor(formation?.etatFormation)}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {hasSeance && (
        <>
          <Divider sx={{ my: 2 }} />

          <Card sx={{ mb: 3, boxShadow: 2 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: "#388e3c" }}>
                  <CalendarTodayIcon />
                </Avatar>
              }
              title="📅 Informations sur la Séance"
              titleTypographyProps={{ variant: "h6", fontWeight: "bold" }}
              sx={{ bgcolor: "#f5f5f5" }}
            />
            <CardContent>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date de séance"
                    type="date"
                    fullWidth
                    value={editedDateSeance}
                    onChange={(e) => setEditedDateSeance(e.target.value)}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Salle"
                    fullWidth
                    value={editedSalle}
                    onChange={(e) => setEditedSalle(e.target.value)}
                    placeholder="Ex: Salle 101"
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Heure début"
                    type="time"
                    fullWidth
                    value={editedHeureDebut}
                    onChange={(e) => setEditedHeureDebut(e.target.value)}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Heure fin"
                    type="time"
                    fullWidth
                    value={editedHeureFin}
                    onChange={(e) => setEditedHeureFin(e.target.value)}
                    variant="outlined"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Grid item xs={12} sx={{ mb: 2 }}>
                <TextField
                  label="Participants (IDs séparés par des virgules)"
                  fullWidth
                  multiline
                  rows={2}
                  value={editedParticipants}
                  onChange={(e) => setEditedParticipants(e.target.value)}
                  placeholder="Ex: id1, id2, id3"
                  variant="outlined"
                  size="small"
                  helperText="Entrez les IDs des participants séparés par des virgules"
                />
              </Grid>

              {seance?.animateurs && seance.animateurs.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
                    👥 Animateurs
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {seance.animateurs.map((a) => (
                      <Chip
                        key={a.id}
                        avatar={<Avatar>{a.nom[0]}</Avatar>}
                        label={`${a.nom} ${a.prenom}`}
                        variant="outlined"
                        size="small"
                        icon={<PersonIcon />}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {seance?.participants && seance.participants.length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
                    👤 Participants Enregistrés
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {seance.participants.map((p) => (
                      <Chip
                        key={p.id}
                        avatar={<Avatar>{p.nom[0]}</Avatar>}
                        label={`${p.nom} ${p.prenom}`}
                        variant="outlined"
                        size="small"
                        color="primary"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!hasSeance && (
        <Card sx={{ boxShadow: 2 }}>
          <CardHeader
            avatar={
              <Avatar sx={{ bgcolor: "#ff9800" }}>
                <InfoIcon />
              </Avatar>
            }
            title="ℹ️ Aucune séance associée"
            titleTypographyProps={{ variant: "body2", color: "#666" }}
            sx={{ bgcolor: "#fff3e0" }}
          />
          <CardContent>
            <Typography variant="body2" sx={{ color: "#999" }}>
              Cette formation n'a pas de séances programmées. Les séances s'affichent une fois créées.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

EventDetails.propTypes = {
  selectedEvent: PropTypes.shape({
    details: PropTypes.shape({
      formation: PropTypes.shape({
        titreFormation: PropTypes.string,
        typeFormation: PropTypes.string,
        dateDebut: PropTypes.string,
        dateFin: PropTypes.string,
        organismeRefExterne: PropTypes.string,
        etatFormation: PropTypes.string,
      }),
      seance: PropTypes.shape({
        dateSeance: PropTypes.string,
        heureDebut: PropTypes.string,
        heureFin: PropTypes.string,
        salle: PropTypes.string,
        animateurs: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            nom: PropTypes.string,
            prenom: PropTypes.string,
          })
        ),
        participants: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            nom: PropTypes.string,
            prenom: PropTypes.string,
          })
        ),
      }),
    }),
  }),
  editedDateSeance: PropTypes.string,
  setEditedDateSeance: PropTypes.func,
  editedHeureDebut: PropTypes.string,
  setEditedHeureDebut: PropTypes.func,
  editedHeureFin: PropTypes.string,
  setEditedHeureFin: PropTypes.func,
  editedSalle: PropTypes.string,
  setEditedSalle: PropTypes.func,
  editedParticipants: PropTypes.string,
  setEditedParticipants: PropTypes.func,
};

export default EventDetails;
