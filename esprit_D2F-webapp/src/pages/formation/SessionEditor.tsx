// SessionEditor.jsx

import { Select, Typography, Space } from "antd";

const { Text } = Typography;

function SessionEditor({ session, enseignants, onSessionChange }: any) {
  const enseignantOptions = enseignants.map((e: any) => ({
    value: e.mail,
    label: `${e.nom} ${e.prenom} (${e.mail})`,
    ...e,
  }));

  const handleAnimateursChange = (values: any) => {
    const selected = enseignants.filter((e: any) => values.includes(e.mail));
    onSessionChange({ ...session, animateurs: selected });
  };

  const handleParticipantsChange = (values: any) => {
    const selected = enseignants.filter((e: any) => values.includes(e.mail));
    onSessionChange({ ...session, participants: selected });
  };

  return (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <Text strong style={{ display: "block", marginBottom: 12 }}>
        Séance du {session.dateSeance} de {session.heureDebut} à {session.heureFin} – Salle : {session.salle || "N/D"}
      </Text>
      <Space direction="vertical" style={{ width: "100%" }}>
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Animateurs</Text>
          <Select
            mode="multiple"
            placeholder="Sélectionner les animateurs"
            options={enseignantOptions}
            value={(session.animateurs || []).map((a: any) => a.mail)}
            onChange={handleAnimateursChange}
            style={{ width: "100%" }}
            optionFilterProp="label"
            showSearch
          />
        </div>
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>Participants</Text>
          <Select
            mode="multiple"
            placeholder="Sélectionner les participants"
            options={enseignantOptions}
            value={(session.participants || []).map((p: any) => p.mail)}
            onChange={handleParticipantsChange}
            style={{ width: "100%" }}
            optionFilterProp="label"
            showSearch
          />
        </div>
      </Space>
    </div>
  );
}

export default SessionEditor;








