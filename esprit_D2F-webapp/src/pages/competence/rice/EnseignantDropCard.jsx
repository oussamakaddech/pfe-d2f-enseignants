import { Avatar, Progress, Tag, Typography } from "antd";
import PropTypes from "prop-types";
import { avatarColor, getInitials } from "./constants.jsx";

const { Text } = Typography;

function loadClass(count) {
  if (count === 0) return "load-none";
  if (count <= 3) return "load-ok";
  if (count <= 6) return "load-high";
  return "load-over";
}

function loadColor(count) {
  if (count === 0) return "#94a3b8";
  if (count <= 3) return "#3b82f6";
  if (count <= 6) return "#f59e0b";
  return "#ef4444";
}

export default function EnseignantDropCard({
  enseignant,
  assignedSavoirs,
  totalSavoirs,
  isDragging,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onTagDragStart,
  onTagDragEnd,
  onRemoveChip,
}) {
  const eid = String(enseignant.id ?? enseignant.enseignantId);
  const count = assignedSavoirs.length;
  const fullName = enseignant.prenom ? `${enseignant.prenom} ${enseignant.nom}` : enseignant.nom;
  const ratio = totalSavoirs > 0 ? Math.round((count * 100) / totalSavoirs) : 0;

  return (
    <div
      className={`ens-drop-card ${loadClass(count)}${isOver ? " is-over" : ""}`}
      ref={null}
      onDragOver={(e) => onDragOver(e, eid)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, eid)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar style={{ background: avatarColor(eid) }}>
          {getInitials(enseignant.nom, enseignant.prenom)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong ellipsis={{ tooltip: fullName }}>{fullName}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {enseignant.grade || enseignant.role || (enseignant.departement ? String(enseignant.departement).toUpperCase() : "")}
            </Text>
          </div>
        </div>
        <Text strong style={{ color: loadColor(count) }}>{count}/{totalSavoirs}</Text>
      </div>

      <Progress
        percent={ratio}
        showInfo={false}
        size={["100%", 4]}
        strokeColor={loadColor(count)}
        style={{ margin: "8px 0" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {assignedSavoirs.map((s) => (
          <Tag
            key={`${eid}-${s.tmpId ?? s.code}`}
            closable
            draggable
            onDragStart={(e) => onTagDragStart(e, eid, s)}
            onDragEnd={onTagDragEnd}
            onClose={() => onRemoveChip(s, eid)}
          >
            {s.nom.length > 20 ? `${s.nom.slice(0, 20)}...` : s.nom}
          </Tag>
        ))}
      </div>

      <div className={`ens-drop-zone${isDragging ? " active" : ""}`}>
        {isOver ? "Déposer ici ✓" : "Déposez un savoir ici..."}
      </div>
    </div>
  );
}

EnseignantDropCard.propTypes = {
  enseignant: PropTypes.object.isRequired,
  assignedSavoirs: PropTypes.array.isRequired,
  totalSavoirs: PropTypes.number.isRequired,
  isDragging: PropTypes.bool,
  isOver: PropTypes.bool,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onTagDragStart: PropTypes.func.isRequired,
  onTagDragEnd: PropTypes.func.isRequired,
  onRemoveChip: PropTypes.func.isRequired,
};
