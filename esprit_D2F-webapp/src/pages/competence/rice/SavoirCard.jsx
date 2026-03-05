// src/pages/competence/rice/SavoirCard.jsx
// Memoized card representing a single Savoir in the review tree.
// Context-menu replaces noisy inline buttons.
// framer-motion provides a smooth lift during HTML5 drag.

import { memo, useState } from "react";
import { Dropdown, Input, Select, Tag, Tooltip, Typography } from "antd";
import {
  DeleteOutlined, EditOutlined, MergeCellsOutlined, HolderOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { NIVEAU_OPTIONS, TYPE_COLOR, TYPE_ICON, TYPE_LABEL } from "./constants.jsx";

const { Text } = Typography;
const { Option } = Select;

// â”€â”€ Context-menu items builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildMenuItems({ onRename, onMerge, onDelete }) {
  return [
    {
      key: "rename",
      icon: <EditOutlined />,
      label: "Renommer",
      onClick: onRename,
    },
    {
      key: "merge",
      icon: <MergeCellsOutlined />,
      label: "Fusionner avec…",
      onClick: onMerge,
    },
    { type: "divider" },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Supprimer",
      danger: true,
      onClick: onDelete,
    },
  ];
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SavoirCard = memo(function SavoirCard({
  savoir,
  di, ci, sci, si,
  editingNom, setEditingNom,
  commitRename, startRename,
  toggleType, setNiveau, setEnseignants,
  deleteSavoir, openMerge, setMergeModal,
  onSavoirDragStart, onSavoirDragEnd,
  isBeingDragged,
  allEnseignants,
}) {
  const [dragging, setDragging] = useState(false);

  const isEditing =
    editingNom?.path[0] === di &&
    editingNom?.path[1] === ci &&
    editingNom?.path[2] === sci &&
    editingNom?.path[3] === si;

  const niveauOpt = NIVEAU_OPTIONS.find((n) => n.value === savoir.niveau);

  const menuItems = buildMenuItems({
    onRename: () => startRename([di, ci, sci, si], savoir.nom),
    onMerge: () => { openMerge(di, ci, sci, si); setMergeModal(true); },
    onDelete: () => deleteSavoir(di, ci, sci, si),
  });

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["contextMenu"]}>
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{
          opacity: isBeingDragged ? 0.4 : 1,
          y: 0,
          scale: dragging ? 1.03 : 1,
          rotate: dragging ? 1.5 : 0,
          boxShadow: dragging
            ? "0 12px 28px rgba(22,119,255,0.28)"
            : isBeingDragged
              ? "none"
              : "0 1px 4px rgba(0,0,0,0.07)",
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, duration: 0.2 }}
        draggable
        onDragStart={(e) => {
          setDragging(true);
          onSavoirDragStart(e, di, ci, sci, si);
        }}
        onDragEnd={(e) => {
          setDragging(false);
          onSavoirDragEnd(e);
        }}
        className={`rice-savoir-card${isBeingDragged ? " rice-savoir-dragging" : ""}`}
        style={{
          borderLeft: `4px solid ${savoir.type === "THEORIQUE" ? "#722ed1" : "#fa541c"}`,
          cursor: dragging ? "grabbing" : "grab",
        }}
        title="Clic droit pour renommer / fusionner / supprimer"
      >
        {/* â”€â”€ Header row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="rice-savoir-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <Input
                size="small"
                value={editingNom.value}
                onChange={(e) =>
                  setEditingNom((prev) => ({ ...prev, value: e.target.value }))
                }
                onPressEnter={commitRename}
                onBlur={commitRename}
                onKeyDown={(e) => e.key === "Escape" && setEditingNom(null)}
                autoFocus
                style={{ maxWidth: 320 }}
                placeholder="Nom du savoir"
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <Tooltip title="Glisser pour assigner à un enseignant">
                  <span className="rice-drag-handle">
                    <HolderOutlined />
                  </span>
                </Tooltip>
                <Text strong className="rice-savoir-name" ellipsis={{ tooltip: savoir.nom }}>
                  {savoir.nom}
                </Text>
                <Text className="rice-savoir-code">[{savoir.code}]</Text>
              </div>
            )}
          </div>

          {/* Subtle right-click hint */}
          {!isEditing && (
            <Text type="secondary" style={{ fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
              ⋮⋮
            </Text>
          )}
        </div>

        {/* â”€â”€ Type / Niveau / Enseignants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="rice-savoir-controls">
          <Tooltip title={`Type : ${TYPE_LABEL[savoir.type]} — cliquer pour basculer`}>
            <Tag
              icon={TYPE_ICON[savoir.type]}
              color={TYPE_COLOR[savoir.type]}
              className="rice-type-badge"
              onClick={() => toggleType(di, ci, sci, si)}
            >
              {TYPE_LABEL[savoir.type]}
            </Tag>
          </Tooltip>

          <Select
            size="small"
            value={savoir.niveau}
            onChange={(v) => setNiveau(di, ci, sci, si, v)}
            style={{ width: 170 }}
            popupMatchSelectWidth={false}
            variant="borderless"
            className="rice-niveau-select"
          >
            {NIVEAU_OPTIONS.map((n) => (
              <Option key={n.value} value={n.value}>
                <span>{n.emoji}</span>{" "}
                <Tag color={n.color} style={{ margin: 0, fontSize: 11 }}>
                  {n.label}
                </Tag>
              </Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            size="small"
            placeholder="+ Assigner"
            value={savoir.enseignantsSuggeres ?? []}
            onChange={(ids) => setEnseignants(di, ci, sci, si, ids)}
            style={{ flex: 1, minWidth: 160 }}
            maxTagCount="responsive"
            optionFilterProp="label"
            showSearch
            allowClear
            variant="borderless"
            options={allEnseignants.map((e) => {
              const id = String(e.id ?? e.enseignantId);
              const label = e.prenom ? `${e.prenom} ${e.nom}` : e.nom;
              return { key: id, value: id, label };
            })}
          />
        </div>

        {/* â”€â”€ Bottom meta â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {niveauOpt && (
          <div className="rice-savoir-meta">
            <span className="rice-savoir-niveau-dot" style={{
              background: savoir.type === "THEORIQUE" ? "#722ed1" : "#fa541c",
            }} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {niveauOpt.emoji} {niveauOpt.label}
            </Text>
            {(savoir.enseignantsSuggeres?.length ?? 0) > 0 && (
              <Tag
                color="green"
                style={{ marginLeft: 6, fontSize: 10, padding: "0 5px", lineHeight: "16px" }}
              >
                {savoir.enseignantsSuggeres.length} ens.
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 10, marginLeft: "auto" }}>
              Clic droit ▶ actions
            </Text>
          </div>
        )}
      </motion.div>
    </Dropdown>
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
};

export default SavoirCard;
