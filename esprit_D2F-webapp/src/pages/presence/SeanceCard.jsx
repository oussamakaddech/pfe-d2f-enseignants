import  { useState } from "react";
import PropTypes from "prop-types";
import PresenceList from "./PresenceList";
import { Card, CardContent, Typography, Button, Collapse, Box } from "@mui/material";
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';

const SeanceCard = ({ seance }) => {
  const [showPresences, setShowPresences] = useState(false);

  const togglePresences = () => {
    setShowPresences((prev) => !prev);
  };

  return (
    <Card variant="outlined" sx={{ marginBottom: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            <CalendarTodayIcon fontSize="small" sx={{ mr: 1 }} />
            Séance du {new Date(seance.dateSeance).toLocaleDateString()}
          </Typography>
          <Button
            variant="contained"
            onClick={togglePresences}
            sx={{ backgroundColor: "red", "&:hover": { backgroundColor: "darkred" } }}
          >
            {showPresences ? "Cacher" : "Voir"} les présences
          </Button>
        </Box>
        <Typography variant="body1" sx={{ mt: 1 }}>
          <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
          De {seance.heureDebut} à {seance.heureFin}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <MeetingRoomIcon fontSize="small" sx={{ mr: 1 }} />
          Salle : {seance.salle}
        </Typography>
        <Collapse in={showPresences}>
          <Box sx={{ mt: 2 }}>
            <PresenceList seanceId={seance.idSeance} />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

SeanceCard.propTypes = {
  seance: PropTypes.shape({
    idSeance: PropTypes.number.isRequired,
    dateSeance: PropTypes.string.isRequired,
    heureDebut: PropTypes.string.isRequired,
    heureFin: PropTypes.string.isRequired,
    salle: PropTypes.string.isRequired,
  }).isRequired,
};

export default SeanceCard;
