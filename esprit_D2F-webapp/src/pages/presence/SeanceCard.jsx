import { useState } from "react";
import PropTypes from "prop-types";
import PresenceList from "./PresenceList";
import { Card, Typography, Button, Space, Tag } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  TeamOutlined,
  RightOutlined,
} from "@ant-design/icons";

const formatTime = (t) => {
  if (!t) return "—";
  // Backend may return "HH:mm:ss" or Date
  if (typeof t === "string") return t.length >= 5 ? t.slice(0, 5) : t;
  try {
    return new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(t);
  }
};

const SeanceCard = ({ seance }) => {
  const [showPresences, setShowPresences] = useState(false);

  const participantsCount = Array.isArray(seance.participants) ? seance.participants.length : 0;
  const presencesCount = Array.isArray(seance.presences) ? seance.presences.length : participantsCount;

  return (
    <Card
      className="seance-card"
      style={{
        marginBottom: 16,
        borderRadius: 16,
        border: "1px solid var(--border-color-soft)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -18px rgba(15, 23, 42, 0.20)",
        overflow: "hidden",
      }}
      title={
        <Space size={12} align="center">
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--primary-500) 0%, #c94010 100%)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 4px 10px -4px rgba(181, 18, 0, 0.5)",
            }}
          >
            <CalendarOutlined />
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", lineHeight: 1.2 }}>
              Séance du {seance.dateSeance ? new Date(seance.dateSeance).toLocaleDateString("fr-FR") : "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatTime(seance.heureDebut)} → {formatTime(seance.heureFin)}
            </div>
          </div>
        </Space>
      }
      extra={
        <Space>
          {presencesCount > 0 && (
            <Tag
              icon={<TeamOutlined />}
              color="blue"
              style={{ borderRadius: 999, fontWeight: 600, padding: "2px 10px" }}
            >
              {presencesCount} inscrit{presencesCount > 1 ? "s" : ""}
            </Tag>
          )}
          <Button
            type={showPresences ? "default" : "primary"}
            onClick={() => setShowPresences((v) => !v)}
            icon={<TeamOutlined />}
            style={{
              borderRadius: 9,
              fontWeight: 500,
              ...(showPresences
                ? {}
                : {
                    background: "linear-gradient(135deg, var(--primary-500) 0%, #9a0f00 100%)",
                    borderColor: "var(--primary-500)",
                    boxShadow: "0 4px 10px -4px rgba(181, 18, 0, 0.45)",
                  }),
            }}
          >
            {showPresences ? "Masquer les présences" : "Gérer les présences"}
            <RightOutlined
              style={{
                marginLeft: 4,
                fontSize: 10,
                transform: showPresences ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size={4}>
        {seance.salle && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            <HomeOutlined style={{ marginRight: 8, color: "var(--primary-500)" }} />
            Salle : <span style={{ color: "var(--text-body)", fontWeight: 500 }}>{seance.salle}</span>
          </Typography.Text>
        )}
        {seance.contenus && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            <strong style={{ color: "var(--text-body)" }}>Contenu :</strong> {seance.contenus}
          </Typography.Text>
        )}
      </Space>

      {showPresences && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px dashed var(--border-color)",
          }}
        >
          <PresenceList seanceId={seance.idSeance} />
        </div>
      )}
    </Card>
  );
};

SeanceCard.propTypes = {
  seance: PropTypes.shape({
    idSeance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    dateSeance: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    heureDebut: PropTypes.any,
    heureFin: PropTypes.any,
    salle: PropTypes.string,
    contenus: PropTypes.string,
    participants: PropTypes.array,
    presences: PropTypes.array,
  }).isRequired,
};

export default SeanceCard;
