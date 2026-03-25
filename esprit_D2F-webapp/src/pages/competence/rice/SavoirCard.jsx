import { memo, useMemo, useState } from "react";
import { Avatar, Dropdown, Input, Select, Space, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, HolderOutlined, MergeCellsOutlined, MoreOutlined } from "@ant-design/icons";
import PropTypes from "prop-types";
import { NIVEAU_OPTIONS, TYPE_LABEL, avatarColor, getInitials } from "./constants.jsx";

const { Text } = Typography;

const NIVEAU_DOT = {
  N1_DEBUTANT: "#94a3b8",
  N2_ELEMENTAIRE: "#3b82f6",
  N3_INTERMEDIAIRE: "#16a34a",
  N4_AVANCE: "#f59e0b",
  N5_EXPERT: "#ef4444",
};

const NIVEAU_SIMPLE = {
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
}) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingNom?.path?.join("-") === `${di}-${ci}-${sci}-${si}`;
  const niveau = NIVEAU_OPTIONS.find((n) => n.value === savoir.niveau) || NIVEAU_OPTIONS[0];

  const assigned = useMemo(() => {
    const ids = (savoir.enseignantsSuggeres ?? []).map((id) => String(id));
    const map = new Map((allEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    return ids.map((id) => ({ id, ens: map.get(id) })).filter((x) => x.ens);
  }, [savoir.enseignantsSuggeres, allEnseignants]);

  const menuItems = [
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

  const removeTeacher = (id) => {
    const next = (savoir.enseignantsSuggeres ?? []).filter((x) => String(x) !== String(id));
    setEnseignants(di, ci, sci, si, next);
  };

  return (
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
          >
            {TYPE_LABEL[savoir.type]}
          </Tag>

          <Space size={4}>
            <span className="niveau-dot" style={{ background: NIVEAU_DOT[savoir.niveau] || "#94a3b8" }} />
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
            {(assigned[0].ens.prenom ? `${assigned[0].ens.prenom} ${assigned[0].ens.nom}` : assigned[0].ens.nom).slice(0, 16)}
          </Text>
          <a onClick={() => removeTeacher(assigned[0].id)}>×</a>
          {assigned.length > 1 && <Text type="secondary">+{assigned.length - 1}</Text>}
        </Space>
      ) : (
        <span className="savoir-unassigned-hint">
          {inlineHint ? "← Glissez vers un enseignant pour affecter" : "Glisser un enseignant →"}
        </span>
      )}

      {hovered && (
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <MoreOutlined style={{ color: "#64748b", cursor: "pointer" }} />
        </Dropdown>
      )}
    </div>
  );
});

SavoirCard.propTypes = {
  savoir: PropTypes.shape({
    nom: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    niveau: PropTypes.string,
    enseignantsSuggeres: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  di: PropTypes.number.isRequired,
  ci: PropTypes.number.isRequired,
  sci: PropTypes.number.isRequired,
  si: PropTypes.number.isRequired,
  editingNom: PropTypes.object,
  setEditingNom: PropTypes.func.isRequired,
  commitRename: PropTypes.func.isRequired,
  startRename: PropTypes.func.isRequired,
  toggleType: PropTypes.func.isRequired,
  setNiveau: PropTypes.func.isRequired,
  setEnseignants: PropTypes.func.isRequired,
  deleteSavoir: PropTypes.func.isRequired,
  openMerge: PropTypes.func.isRequired,
  setMergeModal: PropTypes.func.isRequired,
  onSavoirDragStart: PropTypes.func.isRequired,
  onSavoirDragEnd: PropTypes.func.isRequired,
  isBeingDragged: PropTypes.bool,
  allEnseignants: PropTypes.array.isRequired,
  loadByTeacher: PropTypes.object,
  inlineHint: PropTypes.bool,
};

export default SavoirCard;
