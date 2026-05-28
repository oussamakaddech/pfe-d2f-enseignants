import { memo, useMemo, useState } from "react";
import { Avatar, Dropdown, Input, Select, Space, Tag, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined, EditOutlined, HolderOutlined, MergeCellsOutlined, MoreOutlined } from "@ant-design/icons";
import { NIVEAU_OPTIONS, TYPE_LABEL, avatarColor, getInitials } from "./constants";


const { Text } = Typography;

interface SavoirNode {
  code: string;
  nom: string;
  type: string;
  niveau?: string;
  enseignantsSuggeres?: unknown[];
  aiSuggestedIds?: unknown[];
  tmpId?: string;
}

interface EnseignantRef {
  id?: unknown;
  enseignantId?: unknown;
  nom?: string;
  prenom?: string;
}

interface SavoirCardProps {
  savoir: SavoirNode;
  di: number;
  ci: number;
  sci: number;
  si: number;
  editingNom: { path: number[]; value: string } | null;
  setEditingNom: (v: { path: number[]; value: string } | null | ((p: { path: number[]; value: string }) => { path: number[]; value: string })) => void;
  commitRename: () => void;
  startRename: (path: number[], nom: string) => void;
  toggleType: (di: number, ci: number, sci: number, si: number) => void;
  setNiveau: (di: number, ci: number, sci: number, si: number, v: string) => void;
  setEnseignants: (di: number, ci: number, sci: number, si: number, ids: unknown[]) => void;
  deleteSavoir: (di: number, ci: number, sci: number, si: number) => void;
  openMerge: (di: number, ci: number, sci: number, si: number) => void;
  setMergeModal: (v: boolean) => void;
  onSavoirDragStart: (e: React.DragEvent, di: number, ci: number, sci: number, si: number) => void;
  onSavoirDragEnd: (e: React.DragEvent) => void;
  isBeingDragged?: boolean;
  allEnseignants: EnseignantRef[];
  inlineHint?: boolean;
}

const NIVEAU_DOT: Record<string, string> = {
  N1_DEBUTANT: "#94a3b8",
  N2_ELEMENTAIRE: "#3b82f6",
  N3_INTERMEDIAIRE: "#16a34a",
  N4_AVANCE: "#f59e0b",
  N5_EXPERT: "#ef4444",
};

const NIVEAU_SIMPLE: Record<string, string> = {
  N1_DEBUTANT: "Niveau 1",
  N2_ELEMENTAIRE: "Niveau 2",
  N3_INTERMEDIAIRE: "Niveau 3",
  N4_AVANCE: "Niveau 4",
  N5_EXPERT: "Niveau 5",
};

const SavoirCard = memo(function SavoirCard({
  savoir,
  di,
  ci,
  sci,
  si,
  editingNom,
  setEditingNom,
  commitRename,
  startRename,
  toggleType,
  setNiveau,
  setEnseignants,
  deleteSavoir,
  openMerge,
  setMergeModal,
  onSavoirDragStart,
  onSavoirDragEnd,
  isBeingDragged,
  allEnseignants,
  inlineHint,
}: Readonly<SavoirCardProps>) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingNom?.path?.join("-") === `${di}-${ci}-${sci}-${si}`;
  const assigned = useMemo(() => {
    const ids = (savoir.enseignantsSuggeres ?? []).map(String);
    const map = new Map((allEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    return ids
      .map((id) => ({ id, ens: map.get(id) }))
      .filter((x): x is { id: string; ens: EnseignantRef } => Boolean(x.ens));
  }, [savoir.enseignantsSuggeres, allEnseignants]);
  const aiSuggestionCount = (savoir.aiSuggestedIds ?? []).length;

  const menuItems: MenuProps["items"] = [
    {
      key: "rename",
      icon: <EditOutlined />,
      label: "Renommer",
      onClick: () => startRename([di, ci, sci, si], savoir.nom),
    },
    {
      key: "merge",
      icon: <MergeCellsOutlined />,
      label: "Fusionner avec...",
      onClick: () => {
        openMerge(di, ci, sci, si);
        setMergeModal(true);
      },
    },
    { type: "divider" },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Supprimer",
      danger: true,
      onClick: () => deleteSavoir(di, ci, sci, si),
    },
  ];

  const removeTeacher = (id: string) => {
    const next = (savoir.enseignantsSuggeres ?? []).filter((x) => String(x) !== String(id));
    setEnseignants(di, ci, sci, si, next);
  };

  return (
    /* Draggable savoir card; keyboard users access the dropdown menu (MoreOutlined) for assign / move actions. (S6848 — by-design DnD.) */
    <div
      className={`savoir-card${isBeingDragged ? " is-dragging" : ""}`}
      draggable
      onDragStart={(e) => onSavoirDragStart(e, di, ci, sci, si)}
      onDragEnd={onSavoirDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="savoir-drag-handle"><HolderOutlined /></span>

      <div style={{ minWidth: 0, flex: 1 }}>
        {isEditing ? (
          <Input
            size="small"
            value={editingNom.value}
            onChange={(e) => setEditingNom((p) => ({ ...p, value: e.target.value }))}
            onPressEnter={commitRename}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
            autoFocus
          />
        ) : (
          <Tooltip title={savoir.nom}>
            <Text strong>
              <Tag style={{ marginRight: 6, fontFamily: "monospace", fontWeight: 700 }}>{savoir.code}</Tag>
              {savoir.nom.length > 60 ? `${savoir.nom.slice(0, 60)}...` : savoir.nom}
            </Text>
          </Tooltip>
        )}

        <Space size={6} style={{ marginTop: 6 }} wrap>
          <Tag
            style={{
              background: savoir.type === "THEORIQUE" ? "#f3e8ff" : "#fff7ed",
              color: savoir.type === "THEORIQUE" ? "#7c3aed" : "#c2410c",
              border: "none",
              margin: 0,
            }}
            onClick={() => toggleType(di, ci, sci, si)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleType(di, ci, sci, si); } }}
          >
            {TYPE_LABEL[savoir.type]}
          </Tag>

          <Space size={4}>
            <span className="niveau-dot" style={{ background: NIVEAU_DOT[savoir.niveau ?? ""] || "#94a3b8" }} />
            <Select
              size="small"
              value={savoir.niveau}
              onChange={(v) => setNiveau(di, ci, sci, si, v)}
              options={NIVEAU_OPTIONS.map((n) => ({ value: n.value, label: NIVEAU_SIMPLE[n.value] ?? n.label }))}
              style={{ width: 130 }}
              variant="borderless"
            />
          </Space>
        </Space>
      </div>

      {assigned.length > 0 ? (
        <Space size={6}>
          <Avatar size="small" style={{ background: avatarColor(assigned[0].id) }}>
            {getInitials(assigned[0].ens.nom, assigned[0].ens.prenom)}
          </Avatar>
          <Text style={{ fontSize: 12 }}>
            {(assigned[0].ens.prenom ? `${assigned[0].ens.prenom} ${assigned[0].ens.nom}` : assigned[0].ens.nom ?? "").slice(0, 16)}
          </Text>
          <button type="button" className="link-button" aria-label="Retirer cet enseignant" onClick={() => removeTeacher(assigned[0].id)}>×</button>
          {assigned.length > 1 && <Text type="secondary">+{assigned.length - 1}</Text>}
        </Space>
      ) : (
        <Space size={6} className="savoir-unassigned-hint" wrap>
          <span>{inlineHint ? "← Glissez vers un enseignant pour affecter" : "Glisser un enseignant →"}</span>
          {aiSuggestionCount > 0 && <Tag color="gold">{aiSuggestionCount} suggestion(s) IA</Tag>}
        </Space>
      )}

      {hovered && (
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <MoreOutlined style={{ color: "#64748b", cursor: "pointer" }} />
        </Dropdown>
      )}
    </div>
  );
});

export default SavoirCard;






