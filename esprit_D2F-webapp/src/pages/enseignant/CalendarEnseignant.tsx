
import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale/fr";
import {
  Button,
  Modal,
  Typography,
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
import { useFormationsForCalendar } from "@/hooks/formation";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/pages/calendar-enseignant.css";

const { Title, Text } = Typography;

interface Person {
  id: string | number;
  nom?: string;
  prenom?: string;
  deptLibelle?: string;
  upLibelle?: string;
}

interface Seance {
  idSeance: string | number;
  dateSeance: string;
  heureDebut: string;
  heureFin: string;
  salle?: string;
  animateurs: Person[];
  participants: Person[];
}

interface FormationCalendar {
  idFormation: string | number;
  titreFormation: string;
  typeFormation?: string;
  etatFormation?: string;
  chargeHoraireGlobal?: string;
  seances: Seance[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    role: "animateur" | "participant";
    formation: FormationCalendar;
    seance: Seance;
  };
}

const seanceHasAnimateur = (seance: Seance, enseignantId: string | undefined): boolean =>
  seance.animateurs.some((e) => e.id === enseignantId);

const seanceHasParticipant = (seance: Seance, enseignantId: string | undefined): boolean =>
  seance.participants.some((e) => e.id === enseignantId);

const toAnimateurEvent = (f: FormationCalendar, s: Seance): CalendarEvent => ({
  id: `A-${f.idFormation}-${s.idSeance}`,
  title: f.titreFormation,
  start: new Date(`${s.dateSeance}T${s.heureDebut}`),
  end: new Date(`${s.dateSeance}T${s.heureFin}`),
  allDay: false,
  resource: { role: "animateur", formation: f, seance: s },
});

const toParticipantEvent = (f: FormationCalendar, s: Seance): CalendarEvent => ({
  id: `P-${f.idFormation}-${s.idSeance}`,
  title: f.titreFormation,
  start: new Date(`${s.dateSeance}T${s.heureDebut}`),
  end: new Date(`${s.dateSeance}T${s.heureFin}`),
  allDay: false,
  resource: { role: "participant", formation: f, seance: s },
});

const buildAnimateurEvents = (formations: FormationCalendar[], enseignantId: string | undefined): CalendarEvent[] =>
  formations.flatMap((f) =>
    f.seances
      .filter((s) => seanceHasAnimateur(s, enseignantId))
      .map((s) => toAnimateurEvent(f, s))
  );

const buildParticipantEvents = (formations: FormationCalendar[], enseignantId: string | undefined): CalendarEvent[] =>
  formations.flatMap((f) =>
    f.seances
      .filter((s) => seanceHasParticipant(s, enseignantId))
      .map((s) => toParticipantEvent(f, s))
  );

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
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: calendarDto } = useFormationsForCalendar(enseignantId);
  const dto = calendarDto as { asAnimateur: FormationCalendar[]; asParticipant: FormationCalendar[] } | undefined;

  const enseignantInfo = useMemo(() => {
    if (!dto) return null;
    return dto.asAnimateur
      .flatMap((f) => f.seances ?? [])
      .find((s) => seanceHasAnimateur(s, enseignantId))
      ?.animateurs?.find((e) => e.id === enseignantId) ||
    dto.asParticipant
      .flatMap((f) => f.seances ?? [])
      .find((s) => seanceHasParticipant(s, enseignantId))
      ?.participants?.find((e) => e.id === enseignantId);
  }, [dto, enseignantId]);

  const events = useMemo(() => {
    if (!dto) return [];
    return [
      ...buildAnimateurEvents(dto.asAnimateur, enseignantId),
      ...buildParticipantEvents(dto.asParticipant, enseignantId),
    ];
  }, [dto, enseignantId]);

  const eventStyleGetter = (event: CalendarEvent) => ({
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

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedEvent(null);
  };

  const isAnimateur = selectedEvent?.resource.role === "animateur";

  let seancePeople: Person[] = [];
  if (selectedEvent) {
    const seance = selectedEvent.resource.formation.seances.find(
      (s) => s.idSeance === selectedEvent.resource.seance.idSeance
    );
    seancePeople = isAnimateur ? seance?.participants ?? [] : seance?.animateurs ?? [];
  }

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
            <span className="cal-ens-legend-dot" />{" "}
            Animateur
          </span>
          <span className="cal-ens-legend-item participant">
            <span className="cal-ens-legend-dot" />{" "}
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
          onNavigate={(newDate: Date) => setDate(newDate)}
          onView={(newView: string) => setView(newView)}
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
                  ? seancePeople.map((p: Person) => (
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








