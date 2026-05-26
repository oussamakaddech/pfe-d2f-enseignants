import { useMemo } from "react";
import { Tag, Select, Tooltip } from "antd";
import { BookOutlined, ExperimentOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { NIVEAU_OPTIONS, TYPE_COLOR, TYPE_ICON, TYPE_LABEL } from "./constants";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Savoir {
  id: number | string;
  code?: string;
  nom?: string;
  type?: string;
  niveau?: string | number;
  domaine?: string;
}
interface Enseignant {
  id: number | string;
  nom?: string;
  prenom?: string;
  etat?: string;
}
interface SavoirMatchCardProps {
  savoir: Savoir;
  assignedTeacherIds?: (number | string)[];
  allTeachers?: Enseignant[];
  onAssignChange: (savoirId: number | string, newIds: (number | string)[]) => void;
  onUnassign: (savoirId: number | string, enseignantId: number | string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getNiveauMeta(niveau: string | number | undefined) {
  const hit = NIVEAU_OPTIONS.find((n) => n.value === String(niveau ?? ""));
  return hit ?? { label: niveau ? `N${niveau}` : "—", color: "default", emoji: "" };
}

function getTypeMeta(type: string | undefined) {
  const t = type || "THEORIQUE";
  return {
    color: TYPE_COLOR[t as keyof typeof TYPE_COLOR] ?? "default",
    icon: t === "PRATIQUE" ? <ExperimentOutlined /> : <BookOutlined />,
    label: TYPE_LABEL[t as keyof typeof TYPE_LABEL] ?? t,
  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function SavoirMatchCard({
  savoir,
  assignedTeacherIds = [],
  allTeachers = [],
  onAssignChange,
  onUnassign,
}: Readonly<SavoirMatchCardProps>) {
  const isAssigned = assignedTeacherIds.length > 0;
  const niveauMeta = useMemo(() => getNiveauMeta(savoir.niveau), [savoir.niveau]);
  const typeMeta = useMemo(() => getTypeMeta(savoir.type), [savoir.type]);

  const selectOptions = useMemo(
    () => allTeachers.map((t) => ({
      label: `${t.prenom ?? ""} ${t.nom ?? ""}`.trim(),
      value: t.id,
    })),
    [allTeachers],
  );

  return (
    <div className={`smc-card${isAssigned ? " smc-card--assigned" : " smc-card--unassigned"}`}>
      {/* ── Status stripe ── */}
      <div className={`smc-stripe${isAssigned ? " smc-stripe--ok" : " smc-stripe--warn"}`} />

      {/* ── Header ── */}
      <div className="smc-header">
        <div className="smc-header__left">
          <span className="smc-code">{savoir.code}</span>
          <Tooltip title={savoir.nom}>
            <span className="smc-nom">{savoir.nom}</span>
          </Tooltip>
        </div>
        <div className="smc-header__badges">
          <Tag
            icon={typeMeta.icon}
            color={typeMeta.color}
            className="smc-tag-type"
          >
            {typeMeta.label}
          </Tag>
          <Tag color={niveauMeta.color} className="smc-tag-niveau">
            {niveauMeta.emoji} {niveauMeta.label}
          </Tag>
        </div>
      </div>

      {/* ── Assigned teachers ── */}
      <div className="smc-assigned">
        {isAssigned ? (
          <div className="smc-teachers">
            <CheckCircleOutlined className="smc-teachers__icon" />
            {assignedTeacherIds.map((id) => {
              const t = allTeachers.find((x) => String(x.id) === String(id));
              const label = t ? `${t.prenom ?? ""} ${t.nom ?? ""}`.trim() : String(id);
              return (
                <Tag
                  key={id}
                  closable
                  onClose={() => onUnassign(savoir.id, id)}
                  className="smc-teacher-tag"
                >
                  {label}
                </Tag>
              );
            })}
          </div>
        ) : (
          <div className="smc-unassigned-hint">
            <WarningOutlined className="smc-unassigned-hint__icon" />
            <span>Aucun enseignant assigné</span>
          </div>
        )}
      </div>

      {/* ── Assign select ── */}
      <div className="smc-select-wrap">
        <Select
          mode="multiple"
          placeholder="Affecter un enseignant..."
          options={selectOptions}
          value={assignedTeacherIds}
          onChange={(vals) => onAssignChange(savoir.id, vals)}
          className="smc-select"
          showSearch
          optionFilterProp="label"
          allowClear
          size="small"
        />
      </div>
    </div>
  );
}
