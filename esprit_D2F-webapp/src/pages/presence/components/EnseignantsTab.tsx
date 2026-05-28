import { Avatar, Button, Progress, Table, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, TeamOutlined } from "@ant-design/icons";

const { Text } = Typography;

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

interface EnseignantWithStats {
  mail?: string;
  id?: string;
  nom?: string;
  prenom?: string;
  type?: string;
  seancesInscrites: number;
  presentes: number;
  totalSeancesAvecPresence: number;
  taux: number;
}

interface EnseignantsTabProps {
  readonly participantsWithStats: EnseignantWithStats[];
  readonly seancesCount: number;
  readonly aggLoading: boolean;
  readonly onRefetch: () => void;
}

export function EnseignantsTab({
  participantsWithStats, seancesCount, aggLoading, onRefetch,
}: EnseignantsTabProps) {
  const columns = [
    {
      title: "Enseignant",
      key: "ens",
      render: (_: unknown, r: EnseignantWithStats) => {
        const fullName = `${r.prenom || ""} ${r.nom || ""}`.trim();
        return (
          <div className="fd-ens-cell">
            <Avatar size={36} style={{ background: colorOfName(fullName), fontWeight: 600, fontSize: 13 }}>
              {initialsOf(r.nom, r.prenom)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div className="fd-ens-name">{fullName || "—"}</div>
              <div className="fd-ens-mail">{r.mail || "—"}</div>
            </div>
          </div>
        );
      },
      sorter: (a: EnseignantWithStats, b: EnseignantWithStats) =>
        `${a.nom || ""} ${a.prenom || ""}`.localeCompare(`${b.nom || ""} ${b.prenom || ""}`),
    },
    {
      title: "Type", dataIndex: "type", key: "type", width: 120,
      render: (t: string) => {
        if (!t) return <Text type="secondary">—</Text>;
        const label = t === "P" ? "Permanent" : t === "V" ? "Vacataire" : t;
        return <span className={t === "P" ? "fd-type-tag p" : "fd-type-tag v"}>{label}</span>;
      },
      filters: [{ text: "Permanent", value: "P" }, { text: "Vacataire", value: "V" }],
      onFilter: (v: unknown, r: EnseignantWithStats) => r.type === v,
    },
    {
      title: "Séances inscrites", dataIndex: "seancesInscrites", key: "seancesInscrites", width: 140, align: "center" as const,
      render: (n: number) => <Tag color="blue" style={{ borderRadius: 999, fontWeight: 600 }}>{n} / {seancesCount}</Tag>,
      sorter: (a: EnseignantWithStats, b: EnseignantWithStats) => a.seancesInscrites - b.seancesInscrites,
    },
    {
      title: "Présent", dataIndex: "presentes", key: "presentes", width: 110, align: "center" as const,
      render: (n: number, r: EnseignantWithStats) => (
        <Tooltip title={`${n} séance(s) présent / ${r.totalSeancesAvecPresence} séance(s) jouée(s)`}>
          <Tag color="green" style={{ borderRadius: 999, fontWeight: 600 }}>{n} / {r.totalSeancesAvecPresence}</Tag>
        </Tooltip>
      ),
      sorter: (a: EnseignantWithStats, b: EnseignantWithStats) => a.presentes - b.presentes,
    },
    {
      title: "Taux", dataIndex: "taux", key: "taux", width: 160,
      render: (t: number) => {
        const strokeColor = t < 50 ? "#ef4444" : t < 75 ? "#f59e0b" : "#10b981";
        return <Progress percent={t} size="small" strokeColor={strokeColor} format={(p) => `${p}%`} />;
      },
      sorter: (a: EnseignantWithStats, b: EnseignantWithStats) => a.taux - b.taux,
      defaultSortOrder: "descend" as const,
    },
  ];

  return (
    <div style={{ paddingTop: 8 }}>
      <div className="fd-tab-toolbar">
        <Text type="secondary">
          <TeamOutlined style={{ marginRight: 6 }} />
          {participantsWithStats.length} enseignant{participantsWithStats.length > 1 ? "s" : ""} participent à cette formation
        </Text>
        <Button size="small" icon={<ReloadOutlined />} loading={aggLoading} onClick={onRefetch}>
          Recalculer les présences
        </Button>
      </div>
      <Table
        dataSource={participantsWithStats}
        rowKey={(r) => r.mail ?? r.id ?? ""}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        loading={aggLoading}
        className="fd-enseignants-table"
        size="middle"
        locale={{ emptyText: "Aucun enseignant participant" }}
        columns={columns}
      />
    </div>
  );
}
