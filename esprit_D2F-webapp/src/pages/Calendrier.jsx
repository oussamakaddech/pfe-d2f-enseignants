// CalendarExample.jsx

import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Configurer le localizer avec Moment
const localizer = momentLocalizer(moment);

// Exemple d’événements
const myEventsList = [
  {
    title: "Réunion",
    start: new Date(2025, 1, 20, 10, 0), 
    end: new Date(2025, 1, 20, 12, 0),
  },
  {
    title: "Déjeuner d'équipe",
    start: new Date(2025, 1, 21, 12, 0),
    end: new Date(2025, 1, 21, 13, 0),
  },
];

function Calendrier() {
  return (
    <div style={{ height: "500px", margin: "50px" }}>
      <Calendar
        localizer={localizer}
        events={myEventsList}
        startAccessor="start"
        endAccessor="end"
        defaultView="month"
        views={["month", "week", "day"]}
        style={{ height: 500 }}
      />
    </div>
  );
}

export default Calendrier;
