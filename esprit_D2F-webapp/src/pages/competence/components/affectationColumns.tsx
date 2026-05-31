import { Table, Tag, Space, Tooltip, Button, Popconfirm } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type { EnseignantCompetence } from "@/models/competence";
import type { Id } from "@/models/common";

export const NIVEAU_COLOR: Record<string, string> = {
  N1_DEBUTANT:      "default",
  N2_ELEMENTAIRE:   "blue",
  N3_INTERMEDIAIRE: "cyan",
  N4_AVANCE:        "green",
  N5_EXPERT:        "gold",
};

export const NIVEAU_LABEL: Record<string, string> = {
  N1_DEBUTANT:      "N1",
  N2_ELEMENTAIRE:   "N2",
  N3_INTERMEDIAIRE: "N3",
  N4_AVANCE:        "N4",
  N5_EXPERT:        "N5",
};

export const toNiveauEnum = (niveau: unknown): string | null => {
  const raw = String(niveau ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (["N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"].includes(raw)) {
    return raw;
  }
  if (raw === "N1") return "N1_DEBUTANT";
  if (raw === "N2") return "N2_ELEMENTAIRE";
  if (raw === "N3") return "N3_INTERMEDIAIRE";
  if (raw === "N4") return "N4_AVANCE";
  if (raw === "N5") return "N5_EXPERT";
  return raw;
};

export interface AffectationSavoirRow {
  affId: Id;
  code: string;
  nom: string;
  competenceNom: string;
  niveau: string | null;
}

export interface EnseignantRow {
  key: string;
  enseignantId: string;
  nom: string;
  savoirs: AffectationSavoirRow[];
}

interface BuildColumnsOpts {
  openNiveauModal: (record: AffectationSavoirRow) => void;
  handleDeleteSavoir: (affId: Id) => Promise<void>;
  handleDeleteAll: (rec: EnseignantRow) => Promise<void>;
}

export function buildMainColumns(opts: BuildColumnsOpts): TableColumnsType<EnseignantRow> {
  const { openNiveauModal, handleDeleteAll } = opts;

  return [
    {
      title: "Enseignant",
      dataIndex: "nom",
      key: "nom",
      width: 220,
      sorter: (a, b) => a.nom.localeCompare(b.nom),
      render: (nom: string, rec) => (
        <Space size={8}>
          <div className="affectation-enseignant-avatar">
            {nom?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="affectation-enseignant-name">{nom}</div>
            <div className="affectation-enseignant-id">ID: {rec.enseignantId}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Compétences",
      dataIndex: "savoirs",
      key: "competences",
      width: 260,
      sorter: (a, b) => {
        const aNames = Array.from(new Set(a.savoirs.map((s) => s.competenceNom).filter(Boolean))).sort((x, y) => x.localeCompare(y)).join(" | ");
        const bNames = Array.from(new Set(b.savoirs.map((s) => s.competenceNom).filter(Boolean))).sort((x, y) => x.localeCompare(y)).join(" | ");
        return aNames.localeCompare(bNames);
      },
      render: (savs: AffectationSavoirRow[]) => (
        <Space size={[4, 4]} wrap>
          {Array.from(new Set(savs.map((s) => s.competenceNom).filter(Boolean))).map((compName) => (
            <Tag key={compName} color="geekblue" style={{ fontSize: "var(--text-xs)", borderRadius: "var(--radius-full)" }}>
              {compName}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Codes savoirs",
      dataIndex: "savoirs",
      key: "codes",
      render: (savs: AffectationSavoirRow[]) => (
        <Space size={[4, 4]} wrap>
          {savs.map((s) => (
            <Tooltip key={String(s.affId)} title={s.nom}>
              <Tag
                color="purple"
                style={{ fontWeight: 600, letterSpacing: "0.02em", cursor: "default", fontSize: "var(--text-xs)", borderRadius: "var(--radius-full)" }}
              >
                {s.code}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: "Niveaux",
      dataIndex: "savoirs",
      key: "niveaux",
      width: 260,
      render: (savs: AffectationSavoirRow[]) => (
        <Space size={[4, 4]} wrap>
          {savs.map((s) => (
            <Tooltip key={String(s.affId)} title={`${s.code} – ${s.nom}`}>
              <Tag
                color={NIVEAU_COLOR[s.niveau ?? ""] ?? "default"}
                style={{ cursor: "default", fontSize: "var(--text-xs)", borderRadius: "var(--radius-full)" }}
              >
                {NIVEAU_LABEL[s.niveau ?? ""] ?? s.niveau ?? "—"}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 60,
      align: "center" as const,
      render: (_: unknown, rec) => (
        <Popconfirm
          title={`Supprimer toutes les affectations de ${rec.nom} ?`}
          okText="Supprimer"
          okButtonProps={{ danger: true }}
          cancelText="Annuler"
          onConfirm={() => handleDeleteAll(rec)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];
}

export function buildExpandedColumns(
  openNiveauModal: (record: AffectationSavoirRow) => void,
  handleDeleteSavoir: (affId: Id) => Promise<void>,
): TableColumnsType<AffectationSavoirRow> {
  return [
    { title: "Code", dataIndex: "code", key: "code" },
    { title: "Nom du Savoir", dataIndex: "nom", key: "nom" },
    {
      title: "Niveau",
      dataIndex: "niveau",
      key: "niveau",
      render: (niveau: string) => (
        <Tag color={NIVEAU_COLOR[niveau] ?? "default"}>
          {NIVEAU_LABEL[niveau] ?? niveau ?? "—"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: unknown, sRec) => (
        <Space>
          <Tooltip title="Modifier le niveau">
            <Button size="small" icon={<EditOutlined />} onClick={() => openNiveauModal(sRec)} />
          </Tooltip>
          <Tooltip title="Retirer">
            <Popconfirm
              title="Retirer ce savoir ?"
              onConfirm={() => handleDeleteSavoir(sRec.affId)}
              okText="Oui"
              cancelText="Non"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];
}
