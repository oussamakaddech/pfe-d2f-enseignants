// src/pages/Enseignant/CalendarEnseignant.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  Button,
  Modal,
  Typography,
  Divider,
  Row,
  Col,
  Space,
  Input,
  Tag,
} from "antd";
import { ArrowLeftOutlined, UserOutlined } from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../index.css";

const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

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
  const formatDateInput = d => format(d, "yyyy-MM-dd");

  return (
    <>
      <div style={{ padding: 16 }}>
        {/* bouton retour */}
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
        >
          Retour
        </Button>

        {/* titre + datepicker */}
        <Space style={{ marginBottom: 16 }} size="middle" align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            Calendrier de{" "}
            <span style={{ color: "#1677ff" }}>
              {enseignantInfo
                ? `${enseignantInfo.nom} ${enseignantInfo.prenom}`
                : enseignantId}
            </span>
          </Typography.Title>
          <Input
            type="date"
            value={formatDateInput(date)}
            onChange={e => setDate(new Date(e.target.value))}
            style={{ width: 180 }}
          />
        </Space>

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
      </div>

      {/* popup détaillée */}
      {selectedEvent && (
        <Modal
          open={open}
          onCancel={handleClose}
          title={
            <Typography.Text type="danger" strong>
              {selectedEvent.resource.role === "animateur"
                ? "Animateur"
                : "Participant"}{" "}
              – {selectedEvent.resource.formation.titreFormation}
            </Typography.Text>
          }
          width={700}
          footer={
            <Button onClick={handleClose}>Fermer</Button>
          }
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* en-tête enseignant */}
            <Typography.Text>
              <strong>Enseignant :</strong>{" "}
              <span style={{ color: "#eb2f96" }}>
                {enseignantInfo.nom} {enseignantInfo.prenom}
              </span>{" "}
              — <em>
                {enseignantInfo.deptLibelle || "Dépt. inconnu"} /{" "}
                {enseignantInfo.upLibelle || "UP inconnue"}
              </em>
            </Typography.Text>
            <Divider />

            {/* détails séance */}
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Typography.Text><strong>Date :</strong> {selectedEvent.resource.seance.dateSeance}</Typography.Text>
              </Col>
              <Col span={6}>
                <Typography.Text><strong>Début :</strong> {selectedEvent.resource.seance.heureDebut}</Typography.Text>
              </Col>
              <Col span={6}>
                <Typography.Text><strong>Fin :</strong> {selectedEvent.resource.seance.heureFin}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text><strong>Salle :</strong> {selectedEvent.resource.seance.salle || "—"}</Typography.Text>
              </Col>
              <Col span={12}>
                <Typography.Text><strong>Type :</strong> <Tag color="red">{selectedEvent.resource.formation.typeFormation}</Tag></Typography.Text>
              </Col>
              <Col span={12}>
                <Typography.Text><strong>État :</strong> <Tag color="red">{selectedEvent.resource.formation.etatFormation}</Tag></Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text><strong>Charge horaire :</strong> {selectedEvent.resource.formation.chargeHoraireGlobal} h</Typography.Text>
              </Col>
            </Row>

            <Divider />

            {/* liste des participants ou animateurs */}
            <div>
              <Typography.Text strong>
                {selectedEvent.resource.role === "animateur"
                  ? "Participants :"
                  : "Animateurs :"}
              </Typography.Text>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(selectedEvent.resource.role === "animateur"
                  ? selectedEvent.resource.formation.seances.find(
                      s => s.idSeance === selectedEvent.resource.seance.idSeance
                    ).participants
                  : selectedEvent.resource.formation.seances.find(
                      s => s.idSeance === selectedEvent.resource.seance.idSeance
                    ).animateurs
                ).map(p => (
                  <Tag key={p.id} icon={<UserOutlined />} color="default">
                    {p.nom} {p.prenom}
                  </Tag>
                ))}
              </div>
            </div>
          </Space>
        </Modal>
      )}
    </>
  );
}
