import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarOutlined } from "@ant-design/icons";
import { AppPageHeader } from "../theme";

const localizer = momentLocalizer(moment);

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
    <div>
      <AppPageHeader
        icon={<CalendarOutlined />}
        title="Calendrier"
        subtitle="Vue calendrier des événements et formations"
      />
      <div style={{ height: 600 }}>
        <Calendar
          localizer={localizer}
          events={myEventsList}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          views={["month", "week", "day"]}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}

export default Calendrier;
