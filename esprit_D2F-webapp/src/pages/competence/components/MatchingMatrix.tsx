import React, { createContext, useContext, useMemo } from "react";
import { Progress, Tooltip, Avatar, Tag } from "antd";
import { CheckCircleFilled, CheckOutlined } from "@ant-design/icons";
import type { Id } from "@/models/common";

interface SavoirItem {
  id?: Id;
  code?: string;
  nom?: string;
  type?: string;
  niveau?: string | number;
}

interface SousCompItem {
  id?: Id;
  code?: string;
  nom?: string;
  savoirs?: SavoirItem[];
}

interface CompetenceItem {
  id?: Id;
  code?: string;
  nom?: string;
  allSavoirs?: SavoirItem[];
  sousCompetences?: SousCompItem[];
  savoirs?: SavoirItem[];
}

interface EnseignantItem {
  id?: Id;
  enseignantId?: Id;
  prenom?: string;
  nom?: string;
  departement?: string;
}

interface DragContextValue {
  draggingId: string | null;
  dragOverCell: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, savoirId: string, ensId: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, savoirId: string, ensId: string) => void;
  onUnassign: (savoirId: string, ensId: string) => void;
}

// ─── Context to avoid deep prop drilling ────────────────────────────────────
const DragContext = createContext<DragContextValue>({
  draggingId: null,
  dragOverCell: null,
  onDragStart: () => undefined,
  onDragEnd: () => undefined,
  onDragOver: () => undefined,
  onDragLeave: () => undefined,
  onDrop: () => undefined,
  onUnassign: () => undefined,
});

// ─── Utility ─────────────────────────────────────────────────────────────────
const hashToHsl = (id: Id | undefined) => {
  let h = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + (str.codePointAt(i) ?? 0)) % 360;
  }
  return `hsl(${h}, 65%, 50%)`;
};

const getProgressColor = (pct: number) => {
  if (pct < 40) return "#ef4444";
  if (pct < 75) return "#f59e0b";
  return "#22c55e";
};

// ─── EnseignantHeader ─────────────────────────────────────────────────────────
interface EnseignantHeaderProps {
  enseignant: EnseignantItem;
  count: number;
}

function EnseignantHeader({ enseignant, count }: Readonly<EnseignantHeaderProps>) {
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

// ─── CompetenceGroupRow ───────────────────────────────────────────────────────
interface CompetenceGroupRowProps {
  comp: CompetenceItem;
  enseignants: EnseignantItem[];
  assignments: Record<string, string[]>;
}

function CompetenceGroupRow({ comp, enseignants, assignments }: Readonly<CompetenceGroupRowProps>) {
  const allSavoirs = comp.allSavoirs ?? [];

  return (
    <tr className="comp-group-row">
      <td className="sticky-col">
        <Tag color="blue">{comp.code}</Tag>{" "}
        <strong>{comp.nom}</strong>
      </td>
      {enseignants.map((ens) => {
        const covered = allSavoirs.filter((s) =>
          (assignments[String(s.id)] ?? []).includes(String(ens.id))
        ).length;
        const pct = allSavoirs.length
          ? Math.round((covered / allSavoirs.length) * 100)
          : 0;

        return (
          <td key={String(ens.id)} className="col-ens" style={{ textAlign: "center" }}>
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

// ─── SousCompGroupRow ─────────────────────────────────────────────────────────
interface SousCompGroupRowProps {
  sc: SousCompItem;
  enseignants: EnseignantItem[];
}

// FIX: renders empty <td> for each enseignant column to maintain table structure
function SousCompGroupRow({ sc, enseignants }: Readonly<SousCompGroupRowProps>) {
  return (
    <tr className="sc-group-row">
      <td className="sticky-col">
        <div style={{ paddingLeft: 8 }}>
          <Tag color="cyan">{sc.code}</Tag> {sc.nom}
        </div>
      </td>
      {enseignants.map((ens) => (
        <td key={String(ens.id ?? ens.enseignantId)} className="col-ens" />
      ))}
    </tr>
  );
}

// ─── SavoirRow ────────────────────────────────────────────────────────────────
interface SavoirRowProps {
  savoir: SavoirItem;
  enseignants: EnseignantItem[];
  assignments: Record<string, string[]>;
  isDraggingAny?: boolean;
}

function SavoirRow({ savoir, enseignants, assignments, isDraggingAny }: Readonly<SavoirRowProps>) {
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

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
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
        {/* Draggable label: keyboard users use the cell-level dropdown actions. */}
        <button
          type="button"
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
        </button>
      </td>

      {enseignants.map((ens) => {
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
            onDragStart={(e: React.DragEvent<HTMLTableCellElement>) => {
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
            onDragOver={(e: React.DragEvent<HTMLTableCellElement>) => !isAssigned && onDragOver(e, String(savoir.id), String(ens.id))}
            onDragLeave={(e: React.DragEvent<HTMLTableCellElement>) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              onDragLeave(e);
            }}
            onDrop={(e: React.DragEvent<HTMLTableCellElement>) => !isAssigned && onDrop(e, String(savoir.id), String(ens.id))}
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

// ─── MatchingMatrix (Main Export) ─────────────────────────────────────────────
export interface MatchingMatrixProps {
  competences: CompetenceItem[];
  enseignants: EnseignantItem[];
  assignments: Record<string, string[]>;
  draggingId: string | null;
  dragOverCell: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLElement>, savoirId: string, ensId: string) => void;
  onDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  onDrop: (e: React.DragEvent<HTMLElement>, savoirId: string, ensId: string) => void;
  onUnassign: (savoirId: string, ensId: string) => void;
  isDraggingAny?: boolean;
}

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
}: Readonly<MatchingMatrixProps>) {
  const ensCounts = enseignants.reduce<Record<string, number>>((acc, e) => {
    acc[String(e.id)] = 0;
    return acc;
  }, {});

  Object.values(assignments ?? {}).forEach((ensIds) => {
    ensIds.forEach((eId) => {
      if (ensCounts[String(eId)] !== undefined) {
        ensCounts[String(eId)] += 1;
      }
    });
  });

  const dragContextValue = useMemo<DragContextValue>(() => ({
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
            {enseignants.map((e) => (
              <EnseignantHeader
                key={String(e.id)}
                enseignant={e}
                count={ensCounts[String(e.id)] ?? 0}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {competences.map((comp) => (
            <React.Fragment key={String(comp.id)}>
              {/* Competence summary row */}
              <CompetenceGroupRow
                comp={comp}
                enseignants={enseignants}
                assignments={assignments}
              />

              {/* Sous-compétences and their savoirs */}
              {comp.sousCompetences?.map((sc) => (
                <React.Fragment key={String(sc.id)}>
                  <SousCompGroupRow sc={sc} enseignants={enseignants} />
                  {(sc.savoirs ?? []).map((s) => (
                    <SavoirRow
                      key={String(s.id)}
                      savoir={s}
                      enseignants={enseignants}
                      assignments={assignments}
                      isDraggingAny={isDraggingAny}
                    />
                  ))}
                </React.Fragment>
              ))}

              {/* Direct savoirs (not under a sous-compétence) */}
              {comp.savoirs?.map((s) => (
                <SavoirRow
                  key={String(s.id)}
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
