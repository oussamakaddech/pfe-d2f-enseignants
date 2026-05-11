import { useState } from "react";
import PresenceList from "./PresenceList";
import { Card, Typography, Button, Space } from "antd";
import { CalendarOutlined, ClockCircleOutlined, HomeOutlined } from "@ant-design/icons";

const SeanceCard = ({ seance }) => {
  const [showPresences, setShowPresences] = useState(false);

  const togglePresences = () => {
    setShowPresences((prev) => !prev);
  };

  return (
    <Card
      style={{ marginBottom: 16 }}
      title={
        <Space>
          <CalendarOutlined />
          <span>Séance du {new Date(seance.dateSeance).toLocaleDateString()}</span>
        </Space>
      }
      extra={
        <Button type="primary" danger onClick={togglePresences}>
          {showPresences ? "Cacher" : "Voir"} les présences
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Text>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          De {seance.heureDebut} à {seance.heureFin}
        </Typography.Text>
        <Typography.Text type="secondary">
          <HomeOutlined style={{ marginRight: 8 }} />
          Salle : {seance.salle}
        </Typography.Text>
      </Space>
      {showPresences && (
        <div style={{ marginTop: 16 }}>
          <PresenceList seanceId={seance.idSeance} />
        </div>
      )}
    </Card>
  );
};

export default SeanceCard;
