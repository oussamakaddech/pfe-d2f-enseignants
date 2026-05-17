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
  Tag,
  Card,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./CalendarEnseignant.css";

const { Title, Text } = Typography;

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

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [events, setEvents] = useState([]);
  const [enseignantInfo, setEnseignantInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const dto = await FormationWorkflowService.getFormationsForCalendar(enseignantId);

        const enseignant =
          dto.asAnimateur.flatMap((f) => f.seances)
            .find((s) => s.animateurs.some((e) => e.id === enseignantId))
            ?.animateurs.find((e) => e.id === enseignantId) ||
          dto.asParticipant.flatMap((f) => f.seances)
            .find((s) => s.participants.some((e) => e.id === enseignantId))
            ?.participants.find((e) => e.id === enseignantId);

        setEnseignantInfo(enseignant);

        const animateurEvents = dto.asAnimateur.flatMap((f) =>
          f.seances
            .filter((s) => s.animateurs.some((e) => e.id === enseignantId))
            .map((s) => ({
              id: `A-${f.idFormation}-${s.idSeance}`,
              title: f.titreFormation,
              start: new Date(`${s.dateSeance}T${s.heureDebut}`),
              end: new Date(`${s.dateSeance}T${s.heureFin}`),
              allDay: false,
              resource: { role: "animateur", formation: f, seance: s },
            }))
        );

        const participantEvents = dto.asParticipant.flatMap((f) =>
          f.seances
            .filter((s) => s.participants.some((e) => e.id === enseignantId))
            .map((s) => ({
              id: `P-${f.idFormation}-${s.idSeance}`,
              title: f.titreFormation,
              start: new Date(`${s.dateSeance}T${s.heureDebut}`),
              end: new Date(`${s.dateSeance}T${s.heureFin}`),
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

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.resource.role === "animateur" ? "#ffe4e4" : "#dbeafe",
      borderRadius: 6,
      border: event.resource.role === "animateur" ? "1px solid #f5c6c6" : "1px solid #bfdbfe",
      color: event.resource.role === "animateur" ? "#c0392b" : "#1d4ed8",
      padding: "2px 6px",
      fontWeight: 600,
      fontSize: 12,
    },
    className: event.resource.role === "animateur" ? "blink-animateur" : "",
  });

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedEvent(null);
  };

  const isAnimateur = selectedEvent?.resource.role === "animateur";

  const seancePeople = selectedEvent
    ? (isAnimateur
        ? selectedEvent.resource.formation.seances.find(
            (s) => s.idSeance === selectedEvent.resource.seance.idSeance
          )?.participants ?? []
        : selectedEvent.resource.formation.seances.find(
            (s) => s.idSeance === selectedEvent.resource.seance.idSeance
          )?.animateurs ?? [])
    : [];

  return (
    <div className="cal-ens-container">
      {/* En-tête */}
      <div className="cal-ens-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="cal-ens-back-btn"
        >
          Retour
        </Button>

        <Card className="cal-ens-teacher-card">
          <div className="cal-ens-teacher-info">
            <div className="cal-ens-teacher-avatar">
              <UserOutlined />
            </div>
            <div>
              <Title level={5} className="cal-ens-teacher-name">
                {enseignantInfo
                  ? `${enseignantInfo.nom} ${enseignantInfo.prenom}`
                  : enseignantId}
              </Title>
              {enseignantInfo && (
                <span className="cal-ens-teacher-sub">
                  <ApartmentOutlined style={{ marginRight: 4 }} />
                  {enseignantInfo.deptLibelle || "—"} / {enseignantInfo.upLibelle || "—"}
                </span>
              )}
            </div>
          </div>
          <Space align="center" size="small">
            <CalendarOutlined style={{ color: "var(--text-muted)" }} />
            <input
              type="date"
              className="cal-ens-date-input"
              value={format(date, "yyyy-MM-dd")}
              onChange={(e) => setDate(new Date(e.target.value))}
            />
          </Space>
        </Card>
      </div>

      {/* Légende */}
      <Card size="small" className="cal-ens-legend-card">
        <Space wrap size={12} align="center">
          <span className="cal-ens-legend-label">Légende :</span>
          <span className="cal-ens-legend-item animateur">
            <span className="cal-ens-legend-dot" />
            Animateur
          </span>
          <span className="cal-ens-legend-item participant">
            <span className="cal-ens-legend-dot" />
            Participant
          </span>
        </Space>
      </Card>

      {/* Calendrier */}
      <div className="cal-ens-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          date={date}
          view={view}
          onNavigate={(newDate) => setDate(newDate)}
          onView={(newView) => setView(newView)}
          toolbar
          views={["month", "week", "day"]}
          style={{ height: "100%" }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Modal détail séance */}
      {selectedEvent && (
        <Modal
          open={open}
          onCancel={handleClose}
          className="cal-ens-modal"
          title={
            <Space>
              <span className={`cal-ens-role-badge ${selectedEvent.resource.role}`}>
                {isAnimateur ? "Animateur" : "Participant"}
              </span>
              <Text strong style={{ fontSize: "var(--text-base)" }}>
                {selectedEvent.resource.formation.titreFormation}
              </Text>
            </Space>
          }
          width={680}
          footer={<Button onClick={handleClose}>Fermer</Button>}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Enseignant */}
            <div className="cal-ens-modal-section">
              <Row gutter={[16, 8]}>
                <Col span={24}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">
                      <UserOutlined style={{ marginRight: 4 }} />
                      Enseignant
                    </span>
                    <span className="cal-ens-modal-field-value">
                      {enseignantInfo?.nom} {enseignantInfo?.prenom}
                    </span>
                    <Text type="secondary" style={{ fontSize: "var(--text-xs)" }}>
                      {enseignantInfo?.deptLibelle || "Dépt. inconnu"} / {enseignantInfo?.upLibelle || "UP inconnue"}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Détails séance */}
            <div className="cal-ens-modal-section">
              <Row gutter={[16, 12]}>
                <Col xs={24} sm={12}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      Date
                    </span>
                    <span className="cal-ens-modal-field-value">
                      {selectedEvent.resource.seance.dateSeance}
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Début
                    </span>
                    <span className="cal-ens-modal-field-value">
                      {selectedEvent.resource.seance.heureDebut}
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">Fin</span>
                    <span className="cal-ens-modal-field-value">
                      {selectedEvent.resource.seance.heureFin}
                    </span>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">
                      <EnvironmentOutlined style={{ marginRight: 4 }} />
                      Salle
                    </span>
                    <span className="cal-ens-modal-field-value">
                      {selectedEvent.resource.seance.salle || "—"}
                    </span>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">Type</span>
                    <Tag color="blue" style={{ marginTop: 4 }}>
                      {selectedEvent.resource.formation.typeFormation}
                    </Tag>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">État</span>
                    <Tag color="green" style={{ marginTop: 4 }}>
                      {selectedEvent.resource.formation.etatFormation}
                    </Tag>
                  </div>
                </Col>
                <Col span={24}>
                  <div className="cal-ens-modal-field">
                    <span className="cal-ens-modal-field-label">
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      Charge horaire globale
                    </span>
                    <span className="cal-ens-modal-field-value">
                      {selectedEvent.resource.formation.chargeHoraireGlobal} h
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Personnes associées */}
            <div>
              <Text strong style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <TeamOutlined style={{ marginRight: 6 }} />
                {isAnimateur ? "Participants" : "Animateurs"}
              </Text>
              <div className="cal-ens-modal-person-tags">
                {seancePeople.length > 0
                  ? seancePeople.map((p) => (
                      <Tag key={p.id} icon={<UserOutlined />}>
                        {p.nom} {p.prenom}
                      </Tag>
                    ))
                  : <Text type="secondary">Aucun</Text>
                }
              </div>
            </div>
          </Space>
        </Modal>
      )}
    </div>
  );
}
