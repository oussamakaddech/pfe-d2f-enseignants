// SessionEditor.jsx

import PropTypes from "prop-types";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

function SessionEditor({ session, enseignants, onSessionChange }) {
  // Met à jour la liste des animateurs pour la séance
  const handleAnimateursChange = (event, newValue) => {
    onSessionChange({ ...session, animateurs: newValue });
  };

  // Met à jour la liste des participants pour la séance
  const handleParticipantsChange = (event, newValue) => {
    onSessionChange({ ...session, participants: newValue });
  };

  return (
    <Box sx={{ border: "1px solid #ccc", borderRadius: 1, p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Séance du {session.dateSeance} de {session.heureDebut} à {session.heureFin} – Salle : {session.salle || "N/D"}
      </Typography>
      <Autocomplete
        multiple
        options={enseignants}
        getOptionLabel={(option) => `${option.nom} ${option.prenom} (${option.mail})`}
        value={session.animateurs || []}
        onChange={handleAnimateursChange}
        renderInput={(params) => <TextField {...params} label="Animateurs" variant="outlined" />}
        sx={{ mb: 2 }}
      />
      <Autocomplete
        multiple
        options={enseignants}
        getOptionLabel={(option) => `${option.nom} ${option.prenom} (${option.mail})`}
        value={session.participants || []}
        onChange={handleParticipantsChange}
        renderInput={(params) => <TextField {...params} label="Participants" variant="outlined" />}
      />
    </Box>
  );
}

SessionEditor.propTypes = {
  session: PropTypes.shape({
    dateSeance: PropTypes.string.isRequired,
    heureDebut: PropTypes.string.isRequired,
    heureFin: PropTypes.string.isRequired,
    salle: PropTypes.string,
    animateurs: PropTypes.array,
    participants: PropTypes.array,
  }).isRequired,
  enseignants: PropTypes.array.isRequired,
  onSessionChange: PropTypes.func.isRequired,
};

export default SessionEditor;
