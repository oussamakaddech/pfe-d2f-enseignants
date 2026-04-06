import React from "react";
import PropTypes from "prop-types";
import { Card, Avatar, Tag, Progress, Space, Button, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "./MatchmakingPage.css";

function initials(prenom, nom) {
  const p = (prenom || "").charAt(0).toUpperCase();
  const n = (nom || "").charAt(0).toUpperCase();
  return `${p}${n}`.trim() || "U";
}

function colorFromText(text) {
  let hash = 0;
  for (let i = 0; i < (text || "").length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  const h = hash % 360;
  return `hsl(${h} 70% 50%)`;
}

function TeacherLoadCard({ teacher, assignedSavoirIds = [], totalSavoirs = 1, onChipClick, onUnassign, onEditRequest, onDeactivate }) {
  const percent = Math.round((assignedSavoirIds.length / Math.max(1, totalSavoirs)) * 100);
  const statusColor = percent < 50 ? "#52c41a" : percent < 80 ? "#faad14" : "#ff4d4f";

  return (
    <Card size="small" className="teacher-card" style={{ marginBottom: 10 }}>
      <div className="teacher-row">
        <div style={{ display: "flex", alignItems: "center" }}>
          <Avatar style={{ backgroundColor: colorFromText(teacher.nom || teacher.prenom) }}>{initials(teacher.prenom, teacher.nom)}</Avatar>
          <div style={{ marginLeft: 12 }}>
            <div className="teacher-name">{teacher.prenom} {teacher.nom}</div>
            <div className="teacher-dept">{teacher.departement || teacher.department || '-'}</div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <Space direction="vertical" size={4} style={{ width: 160 }}>
            <Progress percent={percent} strokeColor={statusColor} size="small" />
            <div className="teacher-actions">
              <Button icon={<EditOutlined />} size="small" onClick={() => onEditRequest && onEditRequest(teacher)} />
              <Popconfirm title="Désactiver cet enseignant ?" onConfirm={() => onDeactivate && onDeactivate(teacher.id)}>
                <Button icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </div>
          </Space>
        </div>
      </div>

      <div className="teacher-savoirs">
        {assignedSavoirIds.map((sId) => (
          <Tag key={sId} color="default" closable onClose={() => onUnassign && onUnassign(sId)} onClick={() => onChipClick && onChipClick(sId)}>
            {sId}
          </Tag>
        ))}
        {assignedSavoirIds.length === 0 && <div className="teacher-empty">Aucun savoir</div>}
      </div>
    </Card>
  );
}

TeacherLoadCard.propTypes = {
  teacher: PropTypes.object.isRequired,
  assignedSavoirIds: PropTypes.array,
  totalSavoirs: PropTypes.number,
  onChipClick: PropTypes.func,
  onUnassign: PropTypes.func,
  onEditRequest: PropTypes.func,
  onDeactivate: PropTypes.func,
};

export default TeacherLoadCard;
