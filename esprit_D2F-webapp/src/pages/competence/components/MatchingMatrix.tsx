import React, { createContext, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { Progress, Tooltip, Avatar, Tag } from "antd";
import { CheckCircleFilled, CheckOutlined } from "@ant-design/icons";

// ─── Context to avoid deep prop drilling ────────────────────────────────────
const DragContext = createContext<any>({});

// ─── Utility ─────────────────────────────────────────────────────────────────
const hashToHsl = (id: any) => {
  let h = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + (str.codePointAt(i) ?? 0)) % 360;
  }
  return `hsl(${h}, 65%, 50%)`;
};

const getProgressColor = (pct: any) => {
  if (pct < 40) return "#ef4444";
  if (pct < 75) return "#f59e0b";
  return "#22c55e";
};

// ─── EnseignantHeader ─────────────────────────────────────────────────────────
function EnseignantHeader({ enseignant, count }: any) {
  const fullName = `${enseignant.prenom ?? ""} ${enseignant.nom ?? ""}`.trim();
  const initials = `${(enseignant.prenom ?? "")[0] ?? ""}${(enseignant.nom ?? "")[0] ?? ""}`;

  return (
    <th className="col-ens" scope="col">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <Avatar style={{ backgroundColor: hashToHsl(enseignant.id) }}>
          {initials}
        </Avatar>
        <Tooltip title={fullName}>
          <div
            style={{
              maxWidth: 80,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12,
            }}
          >
            {fullName}
          </div>
        </Tooltip>
        <div>
          <Tag>{enseignant.departement}</Tag>
          {count > 0 && <Tag color="geekblue">{count}</Tag>}
        </div>
      </div>
    </th>
  );
}

EnseignantHeader.propTypes = {
  enseignant: PropTypes.object.isRequired,
  count: PropTypes.number,
};

// ─── CompetenceGroupRow ───────────────────────────────────────────────────────
function CompetenceGroupRow({ comp, enseignants, assignments }: any) {
  const allSavoirs = comp.allSavoirs ?? [];

  return (
    <tr className="comp-group-row">
      <td className="sticky-col">
        <Tag color="blue">{comp.code}</Tag>{" "}
        <strong>{comp.nom}</strong>
      </td>
      {enseignants.map((ens: any) => {
        const covered = allSavoirs.filter((s: any) =>
          (assignments[String(s.id)] ?? []).includes(String(ens.id))
        ).length;
        const pct = allSavoirs.length
          ? Math.round((covered / allSavoirs.length) * 100)
          : 0;

        return (
          <td key={ens.id} className="col-ens" style={{ textAlign: "center" }}>
            {(() => {
              if (pct === 0) return null;
              if (pct === 100) return <CheckCircleFilled style={{ color: "#22c55e", fontSize: 20 }} />;
              return <Progress type="circle" size={32} percent={pct} strokeColor={getProgressColor(pct)} />;
            })()}
          </td>
        );
      })}
    </tr>
  );
}

CompetenceGroupRow.propTypes = {
  comp: PropTypes.object.isRequired,
  enseignants: PropTypes.array.isRequired,
  assignments: PropTypes.object.isRequired,
};

// ─── SousCompGroupRow ─────────────────────────────────────────────────────────
// FIX: renders empty <td> for each enseignant column to maintain table structure
function SousCompGroupRow({ sc, enseignants }: any) {
  return (
    <tr className="sc-group-row">
      <td className="sticky-col">
        <div style={{ paddingLeft: 8 }}>
          <Tag color="cyan">{sc.code}</Tag> {sc.nom}
        </div>
      </td>
      {enseignants.map((ens: any) => (
        <td key={ens.id ?? ens.enseignantId} className="col-ens" />
      ))}
    </tr>
  );
}

SousCompGroupRow.propTypes = {
  sc: PropTypes.object.isRequired,
  enseignants: PropTypes.array.isRequired,
};

// ─── SavoirRow ────────────────────────────────────────────────────────────────
function SavoirRow({ savoir, enseignants, assignments, isDraggingAny }: any) {
  const {
    draggingId,
    dragOverCell,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    onUnassign,
  } = useContext(DragContext);

  const isBeingDragged = draggingId === String(savoir.id);
  const isAssignedAnywhere = (assignments[String(savoir.id)] ?? []).length > 0;

  const handleDragStart = (e: any) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ savoirId: String(savoir.id), savoirNom: savoir.nom })
    );
    e.dataTransfer.effectAllowed = "copy";
    onDragStart(String(savoir.id));
  };

  return (
    <tr className="savoir-row">
      <td className="sticky-col">
        {/* Draggable label: keyboard users use the cell-level dropdown actions. (S6848 — by-design DnD.) */}
        <div
          className="savoir-label"
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          style={{ opacity: isBeingDragged ? 0.4 : 1, display: "flex", alignItems: "center" }}
        >
          <div className={isAssignedAnywhere ? "dot-assigned" : "dot-unassigned"} />
          <div style={{ marginLeft: 8 }}>
            <div
              style={{ fontSize: 13 }}
              title={`${savoir.nom} (${savoir.type} - niveau ${savoir.niveau})`}
            >
              {`${savoir.code ?? ""} ${savoir.nom}`.slice(0, 28)}
            </div>
          </div>
        </div>
      </td>

      {enseignants.map((ens: any) => {
        const isAssigned = (assignments[String(savoir.id)] ?? []).includes(String(ens.id));
        const cellKey = `${savoir.id}-${ens.id}`;
        const isActive = dragOverCell === cellKey;

        let cellClass = "cell-empty";
        if (isAssigned) cellClass = "cell-assigned";
        else if (isActive) cellClass = "cell-drop-active";

        return (
          <td
            key={cellKey}
            className={cellClass}
            draggable={isAssigned}
            onDragStart={(e: any) => {
              if (!isAssigned) return;
              e.dataTransfer.setData(
                "application/json",
                JSON.stringify({
                  savoirId: String(savoir.id),
                  fromEnsId: String(ens.id),
                  action: "reassign",
                })
              );
              e.dataTransfer.effectAllowed = "move";
              onDragStart(String(savoir.id));
            }}
            onDragEnd={onDragEnd}
            onClick={() => isAssigned && onUnassign(String(savoir.id), String(ens.id))}
            onDragOver={(e: any) => !isAssigned && onDragOver(e, String(savoir.id), String(ens.id))}
            onDragLeave={(e: any) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              onDragLeave(e);
            }}
            onDrop={(e: any) => !isAssigned && onDrop(e, String(savoir.id), String(ens.id))}
            style={{
              cursor: isAssigned ? "grab" : "default",
              textAlign: "center",
              opacity: isDraggingAny && isAssigned && draggingId === String(savoir.id) ? 0.7 : 1,
            }}
            title={isAssigned ? "Cliquer pour retirer l'affectation" : undefined}
          >
            {isAssigned && <CheckOutlined style={{ color: "#16a34a" }} />}
          </td>
        );
      })}
    </tr>
  );
}

SavoirRow.propTypes = {
  savoir: PropTypes.object.isRequired,
  enseignants: PropTypes.array.isRequired,
  assignments: PropTypes.object.isRequired,
  isDraggingAny: PropTypes.bool,
};

// ─── MatchingMatrix (Main Export) ─────────────────────────────────────────────
export default function MatchingMatrix({
  competences,
  enseignants,
  assignments,
  draggingId,
  dragOverCell,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onUnassign,
  isDraggingAny,
}: any) {
  // Count assignments per enseignant
  const ensCounts = enseignants.reduce((acc: any, e: any) => {
    acc[String(e.id)] = 0;
    return acc;
  }, {});

  Object.values(assignments ?? {}).forEach((ensIds: any) => {
    (ensIds ?? []).forEach((eId: any) => {
      if (ensCounts[String(eId)] !== undefined) {
        ensCounts[String(eId)] += 1;
      }
    });
  });

  const dragContextValue = useMemo(() => ({
    draggingId,
    dragOverCell,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    onUnassign,
  }), [draggingId, dragOverCell, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onUnassign]);

  return (
    <DragContext.Provider value={dragContextValue}>
      <table className="matching-table">
        <thead>
          <tr className="sticky-header">
            <th className="sticky-col">Compétence / Savoir</th>
            {enseignants.map((e: any) => (
              <EnseignantHeader
                key={e.id}
                enseignant={e}
                count={ensCounts[String(e.id)]}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {competences.map((comp: any) => (
            <React.Fragment key={comp.id}>
              {/* Competence summary row */}
              <CompetenceGroupRow
                comp={comp}
                enseignants={enseignants}
                assignments={assignments}
              />

              {/* Sous-compétences and their savoirs */}
              {comp.sousCompetences?.map((sc: any) => (
                <React.Fragment key={sc.id}>
                  <SousCompGroupRow sc={sc} enseignants={enseignants} />
                  {(sc.savoirs ?? []).map((s: any) => (
                    <SavoirRow
                      key={s.id}
                      savoir={s}
                      enseignants={enseignants}
                      assignments={assignments}
                      isDraggingAny={isDraggingAny}
                    />
                  ))}
                </React.Fragment>
              ))}

              {/* Direct savoirs (not under a sous-compétence) */}
              {comp.savoirs?.map((s: any) => (
                <SavoirRow
                  key={s.id}
                  savoir={s}
                  enseignants={enseignants}
                  assignments={assignments}
                  isDraggingAny={isDraggingAny}
                />
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </DragContext.Provider>
  );
}

MatchingMatrix.propTypes = {
  competences: PropTypes.array.isRequired,
  enseignants: PropTypes.array.isRequired,
  assignments: PropTypes.object.isRequired,
  draggingId: PropTypes.string,
  dragOverCell: PropTypes.string,
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onUnassign: PropTypes.func.isRequired,
  isDraggingAny: PropTypes.bool,
};






