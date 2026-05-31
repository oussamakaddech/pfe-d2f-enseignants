import { Avatar, Progress, Tag, Tooltip, Typography } from "antd";
import { avatarColor, getInitials } from "./constants";

interface SavoirRef { tmpId?: string; code?: string; nom: string }
interface EnseignantRef {
  id?: unknown;
  enseignantId?: unknown;
  nom: string;
  prenom?: string;
  grade?: string;
  role?: string;
  departement?: string;
}

interface EnseignantDropCardProps {
  enseignant: EnseignantRef;
  assignedSavoirs: SavoirRef[];
  totalSavoirs: number;
  isDragging?: boolean;
  isOver?: boolean;
  onDragOver: (e: React.DragEvent, eid: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, eid: string) => void;
  onTagDragStart: (e: React.DragEvent, eid: string, s: SavoirRef) => void;
  onTagDragEnd: (e: React.DragEvent) => void;
  onRemoveChip: (s: SavoirRef, eid: string) => void;
}


const { Text } = Typography;

function loadClass(count: number) {
  if (count === 0) return "load-none";
  if (count <= 3) return "load-ok";
  if (count <= 6) return "load-high";
  return "load-over";
}

function loadColor(count: number) {
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
}: Readonly<EnseignantDropCardProps>) {
  const eid = String(enseignant.id ?? enseignant.enseignantId);
  const count = assignedSavoirs.length;
  const fullName = enseignant.prenom ? `${enseignant.prenom} ${enseignant.nom}` : enseignant.nom;
  const ratio = totalSavoirs > 0 ? Math.round((count * 100) / totalSavoirs) : 0;

  return (
    /* Drop target: keyboard users can use the explicit "Assign" actions from the per-savoir dropdown menu. */
    <div
      role="region"
      className={`ens-drop-card ${loadClass(count)}${isOver ? " is-over" : ""}`}
      ref={null}
      aria-label={`Affectations de ${fullName}`}
      onDragOver={(e) => onDragOver(e, eid)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, eid)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar style={{ background: avatarColor(eid) }}>
          {getInitials(enseignant.nom, enseignant.prenom)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tooltip title={fullName}>
            <Text
              strong
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fullName}
            </Text>
          </Tooltip>
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







