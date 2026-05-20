// src/pages/EventDetails.jsx

import { format } from "date-fns";
import "@/styles/pages/event-details.css";
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Divider,
  Avatar,
  Space,
  Input,
  Alert,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  InfoCircleOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

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

  const getEtatTagColor = (etat) => {
    const colors = {
      ENREGISTRE: "warning",
      PLANIFIE: "processing",
      EN_COURS: "success",
      ACHEVE: "default",
      ANNULE: "error",
    };
    return colors[etat] || "default";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <Card
        style={{ marginBottom: 24 }}
        title={
          <Space>
            <Avatar style={{ backgroundColor: "#1976d2" }} icon={<ScheduleOutlined />} />
            <Text strong>📌 Informations sur la Formation</Text>
          </Space>
        }
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={16}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Formation</Text>
            <Input readOnly value={formation?.titreFormation || ""} />
          </Col>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Type</Text>
            <Input readOnly value={formation?.typeFormation || "N/A"} />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Début</Text>
            <Input
              readOnly
              value={formation?.dateDebut ? format(new Date(formation.dateDebut), "dd/MM/yyyy") : ""}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Fin</Text>
            <Input
              readOnly
              value={formation?.dateFin ? format(new Date(formation.dateFin), "dd/MM/yyyy") : ""}
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Organisme</Text>
            <Input readOnly value={formation?.organismeRefExterne || "N/A"} />
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>État</Text>
            <Tag color={getEtatTagColor(formation?.etatFormation)} style={{ fontSize: 14, padding: "4px 12px" }}>
              {formation?.etatFormation || "N/A"}
            </Tag>
          </Col>
        </Row>
      </Card>

      {hasSeance && (
        <>
          <Divider />

          <Card
            style={{ marginBottom: 24 }}
            title={
              <Space>
                <Avatar style={{ backgroundColor: "#388e3c" }} icon={<CalendarOutlined />} />
                <Text strong>📅 Informations sur la Séance</Text>
              </Space>
            }
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Date de séance</Text>
                <Input
                  type="date"
                  value={editedDateSeance}
                  onChange={(e) => setEditedDateSeance?.(e.target.value)}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Salle</Text>
                <Input
                  value={editedSalle}
                  onChange={(e) => setEditedSalle?.(e.target.value)}
                  placeholder="Ex: Salle 101"
                  prefix={<EnvironmentOutlined />}
                />
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Heure début</Text>
                <Input
                  type="time"
                  value={editedHeureDebut}
                  onChange={(e) => setEditedHeureDebut?.(e.target.value)}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Heure fin</Text>
                <Input
                  type="time"
                  value={editedHeureFin}
                  onChange={(e) => setEditedHeureFin?.(e.target.value)}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                Participants (IDs séparés par des virgules)
              </Text>
              <Input.TextArea
                rows={2}
                value={editedParticipants}
                onChange={(e) => setEditedParticipants?.(e.target.value)}
                placeholder="Ex: id1, id2, id3"
              />
            </div>

            {seance?.animateurs && seance.animateurs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>👥 Animateurs</Text>
                <Space wrap>
                  {seance.animateurs.map((a) => (
                    <Tag key={a.id} icon={<UserOutlined />} color="blue">
                      {a.nom} {a.prenom}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {seance?.participants && seance.participants.length > 0 && (
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>👤 Participants Enregistrés</Text>
                <Space wrap>
                  {seance.participants.map((p) => (
                    <Tag key={p.id} icon={<UserOutlined />} color="green">
                      {p.nom} {p.prenom}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </>
      )}

      {!hasSeance && (
        <Alert
          message="ℹ️ Aucune séance associée"
          description="Cette formation n'a pas de séances programmées. Les séances s'affichent une fois créées."
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      )}
    </div>
  );
};

export default EventDetails;








