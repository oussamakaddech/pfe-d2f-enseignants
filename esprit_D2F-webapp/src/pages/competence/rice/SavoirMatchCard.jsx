import React from "react";
import PropTypes from "prop-types";
import { Card, Tag, Select } from "antd";
import "./MatchmakingPage.css";

function SavoirMatchCard({ savoir, assignedTeacherIds = [], allTeachers = [], onAssignChange, onUnassign, innerRef }) {
  const options = allTeachers.map((t) => ({ label: `${t.prenom} ${t.nom}`, value: t.id }));

  return (
    <div className="savoir-card" ref={innerRef}>
      <Card size="small">
        <div className="savoir-header">
          <div>
            <strong>{savoir.code}</strong> &nbsp; {savoir.nom}
          </div>
          <div>
            <Tag color={(savoir.type || "THEORIQUE") === "PRATIQUE" ? "green" : "blue"}>{savoir.type || "THEORIQUE"}</Tag>
            <Tag className="savoir-niveau">{`N${savoir.niveau ?? 1}`}</Tag>
          </div>
        </div>

        <div className={`savoir-assigned ${assignedTeacherIds.length === 0 ? "savoir-unassigned" : ""}`}>
          {assignedTeacherIds.map((id) => {
            const t = allTeachers.find((x) => x.id === id) || { prenom: "?", nom: "?" };
            return (
              <Tag key={id} closable onClose={() => onUnassign(savoir.id, id)}>
                {t.prenom} {t.nom}
              </Tag>
            );
          })}
        </div>

        <div className="savoir-actions">
          <Select
            mode="multiple"
            placeholder="+ Affecter"
            options={options}
            value={assignedTeacherIds}
            onChange={(vals) => onAssignChange(savoir.id, vals)}
            style={{ minWidth: 220 }}
            showSearch
            optionFilterProp="label"
            allowClear
          />
        </div>
      </Card>
    </div>
  );
}

SavoirMatchCard.propTypes = {
  savoir: PropTypes.object.isRequired,
  assignedTeacherIds: PropTypes.array,
  allTeachers: PropTypes.array,
  onAssignChange: PropTypes.func.isRequired,
  onUnassign: PropTypes.func.isRequired,
  innerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};

export default SavoirMatchCard;
