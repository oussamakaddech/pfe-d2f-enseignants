import { useMemo } from "react";
import { Avatar, Tag, Progress, Popconfirm, Tooltip, Button } from "antd";
import { EditOutlined, StopOutlined } from "@ant-design/icons";
import { avatarColor, getInitials } from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Enseignant {
  id: number | string;
  nom?: string;
  prenom?: string;
  departement?: string;
  grade?: string;
}
interface TeacherLoadCardProps {
  teacher: Enseignant;
  assignedSavoirIds?: (number | string)[];
  savoirCodeMap?: Map<string, string>;
  totalSavoirs?: number;
  onChipClick?: (savoirId: number | string) => void;
  onUnassign?: (savoirId: number | string) => void;
  onEditRequest?: (teacher: Enseignant) => void;
  onDeactivate?: () => void;
}

// ── Progress stroke color ──────────────────────────────────────────────────────
function loadColor(pct: number): string {
  if (pct === 0) return "#d9d9d9";
  if (pct <= 30) return "#52c41a";
  if (pct <= 60) return "#faad14";
  return "#ff4d4f";
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TeacherLoadCard({
  teacher,
  assignedSavoirIds = [],
  savoirCodeMap,
  totalSavoirs = 1,
  onChipClick,
  onUnassign,
  onEditRequest,
  onDeactivate,
}: Readonly<TeacherLoadCardProps>) {
  const count = assignedSavoirIds.length;
  const percent = useMemo(
    () => Math.round((count / Math.max(1, totalSavoirs)) * 100),
    [count, totalSavoirs],
  );

  const avatarBg = useMemo(() => avatarColor(teacher.id), [teacher.id]);
  const initials = useMemo(
    () => getInitials(teacher.nom ?? "", teacher.prenom ?? ""),
    [teacher.nom, teacher.prenom],
  );
  const fullName = `${teacher.prenom ?? ""} ${teacher.nom ?? ""}`.trim();
  const dept = (teacher.departement ?? "").toUpperCase();

  return (
    <div className="tlc-card">
      {/* ── Header row ── */}
      <div className="tlc-header">
        <Avatar className="tlc-avatar" style={{ background: avatarBg }} size={38}>
          {initials}
        </Avatar>

        <div className="tlc-info">
          <div className="tlc-name">{fullName || "—"}</div>
          <div className="tlc-meta">
            {dept && <span className="tlc-dept">{dept}</span>}
            {teacher.grade && <span className="tlc-grade">{teacher.grade}</span>}
          </div>
        </div>

        <div className="tlc-actions">
          <Tooltip title="Modifier">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditRequest?.(teacher)}
              className="tlc-action-btn"
            />
          </Tooltip>
          <Popconfirm
            title="Désactiver cet enseignant ?"
            description="Toutes ses affectations seront retirées."
            okText="Désactiver"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDeactivate?.()}
          >
            <Tooltip title="Désactiver">
              <Button
                type="text"
                size="small"
                icon={<StopOutlined />}
                className="tlc-action-btn tlc-action-btn--danger"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>

      {/* ── Load bar ── */}
      <div className="tlc-load">
        <Progress
          percent={percent}
          strokeColor={loadColor(percent)}
          trailColor="#f0f0f0"
          size="small"
          format={() => `${count} savoir${count > 1 ? "s" : ""}`}
        />
      </div>

      {/* ── Savoir chips ── */}
      {count > 0 && (
        <div className="tlc-chips">
          {assignedSavoirIds.map((sId) => {
            const code = savoirCodeMap?.get(String(sId)) ?? String(sId);
            return (
              <Tag
                key={sId}
                closable
                className="tlc-chip"
                onClose={() => onUnassign?.(sId)}
                onClick={() => onChipClick?.(sId)}
              >
                {code}
              </Tag>
            );
          })}
        </div>
      )}
      {count === 0 && <p className="tlc-empty">Aucun savoir assigné</p>}
    </div>
  );
}
