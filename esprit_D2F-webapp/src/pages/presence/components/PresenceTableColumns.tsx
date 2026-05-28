import { Avatar, Input, Switch, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, EditOutlined } from "@ant-design/icons";

const { Text } = Typography;

export interface PresenceRecord {
  idParticipation: number;
  presence: boolean;
  commentaire?: string;
  enseignant?: {
    nom?: string;
    prenom?: string;
    mail?: string;
    type?: string;
  };
}

const initialsOf = (nom?: string, prenom?: string): string => {
  const a = (prenom || "").trim().charAt(0).toUpperCase();
  const b = (nom || "").trim().charAt(0).toUpperCase();
  return (a + b) || "?";
};

const colorOfName = (str: string): string => {
  const palette = ["#B51200", "#0891b2", "#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777"];
  let h = 0;
  for (let i = 0; i < (str || "").length; i += 1) h = (h * 31 + (str.codePointAt(i) ?? 0)) >>> 0;
  return palette[h % palette.length];
};

interface ColumnBuilderArgs {
  dirtyIds: number[];
  togglePresence: (id: number, value: boolean) => void;
  setCommentaire: (id: number, value: string) => void;
}

export function buildPresenceColumns({ dirtyIds, togglePresence, setCommentaire }: ColumnBuilderArgs) {
  return [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_: unknown, r: PresenceRecord) => {
        const fullName = `${r.enseignant?.prenom || ""} ${r.enseignant?.nom || ""}`.trim();
        const isDirty = dirtyIds.includes(r.idParticipation);
        return (
          <div className="presence-enseignant-cell">
            <Avatar size={36} style={{ background: colorOfName(fullName), fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
              {initialsOf(r.enseignant?.nom, r.enseignant?.prenom)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="presence-enseignant-name">
                {fullName || "—"}
                {isDirty && <span className="presence-dirty-dot" title="Modification non enregistrée" />}
              </div>
              <div className="presence-enseignant-mail">{r.enseignant?.mail || "—"}</div>
            </div>
          </div>
        );
      },
      sorter: (a: PresenceRecord, b: PresenceRecord) =>
        `${a.enseignant?.nom || ""} ${a.enseignant?.prenom || ""}`.localeCompare(
          `${b.enseignant?.nom || ""} ${b.enseignant?.prenom || ""}`
        ),
    },
    {
      title: "Type",
      dataIndex: ["enseignant", "type"],
      key: "type",
      width: 110,
      render: (t: string) => {
        if (!t) return <Text type="secondary">—</Text>;
        let label = t;
        if (t === "P") label = "Permanent";
        else if (t === "V") label = "Vacataire";
        const cls = t === "P" ? "presence-type-tag p" : "presence-type-tag v";
        return <span className={cls}>{label}</span>;
      },
      filters: [
        { text: "Permanent", value: "P" },
        { text: "Vacataire", value: "V" },
      ],
      onFilter: (value: unknown, record: PresenceRecord) => record.enseignant?.type === value,
    },
    {
      title: "Statut",
      key: "statut",
      width: 140,
      align: "center" as const,
      render: (_: unknown, r: PresenceRecord) => (
        <Switch
          checked={!!r.presence}
          onChange={(checked) => togglePresence(r.idParticipation, checked)}
          checkedChildren={<><CheckCircleOutlined /> Présent</>}
          unCheckedChildren={<><CloseCircleOutlined /> Absent</>}
          className={r.presence ? "presence-switch-on" : "presence-switch-off"}
        />
      ),
      filters: [
        { text: "Présent", value: true },
        { text: "Absent", value: false },
      ],
      onFilter: (value: unknown, record: PresenceRecord) => !!record.presence === value,
    },
    {
      title: (
        <span>
          <EditOutlined style={{ marginRight: 6, color: "var(--neutral-400)" }} />
          Commentaire
        </span>
      ),
      key: "commentaire",
      render: (_: unknown, r: PresenceRecord) => (
        <Input
          size="small"
          placeholder="Justification, remarque..."
          value={r.commentaire || ""}
          onChange={(e) => setCommentaire(r.idParticipation, e.target.value)}
          maxLength={255}
          className="presence-comment-input"
          allowClear
        />
      ),
    },
  ];
}
