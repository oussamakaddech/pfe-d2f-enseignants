import { Switch, Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";
import { ApartmentOutlined, BookOutlined } from "@ant-design/icons";
import { NIVEAU_SAVOIR_OPTIONS, TYPE_SAVOIR_OPTIONS } from "@/utils/constants/competenceOptions";
import type { Domaine, Competence, Savoir } from "@/models/competence";
import type { Id } from "@/models/common";

const ellipsisStyle = {
  display: "block",
  maxWidth: 360,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function countSousComp(nodes: { enfants?: unknown[] }[]): number {
  return (nodes ?? []).reduce((sum, node) => sum + 1 + countSousComp((node.enfants ?? []) as { enfants?: unknown[] }[]), 0);
}

export function buildDomaineColumns(
  onToggleActif: (id: Id) => void,
): TableColumnsType<Domaine> {
  return [
    { title: "Code", dataIndex: "code", key: "code", width: 130 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => (a.nom ?? "").localeCompare(b.nom ?? "") },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined) => <span style={ellipsisStyle}>{value ?? "-"}</span>,
    },
    {
      title: "Actif",
      dataIndex: "actif",
      key: "actif",
      width: 80,
      render: (actif: boolean, record) => (
        <Switch
          checked={actif}
          size="small"
          onChange={() => { onToggleActif(record.id!); }}
        />
      ),
    },
    {
      title: "Compétences",
      key: "nbComp",
      width: 110,
      render: (_: unknown, record) => <Tag color="blue">{record.competences?.length ?? 0}</Tag>,
    },
  ];
}

export function buildCompColumns(
  domaines: Domaine[],
  savoirsCount: (competenceId: Id) => number,
): TableColumnsType<Competence> {
  return [
    {
      title: "",
      key: "hint",
      width: 30,
      render: () => (
        <Tooltip title="Déplier pour voir les compétences filles">
          <ApartmentOutlined style={{ color: "#d9d9d9" }} />
        </Tooltip>
      ),
    },
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => (a.nom ?? "").localeCompare(b.nom ?? "") },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined) => <span style={ellipsisStyle}>{value ?? "-"}</span>,
    },
    {
      title: "Domaine",
      dataIndex: "domaineNom",
      key: "domaineNom",
      filters: domaines.map((d) => ({ text: d.nom ?? "", value: d.nom ?? "" })),
      onFilter: (v, r) => r.domaineNom === v,
    },
    {
      title: "Structure",
      key: "structure",
      width: 140,
      render: (_: unknown, r) => {
        const nbSc = countSousComp(r.sousCompetences ?? []);
        const nbDirectFromComp = r.savoirs?.length ?? 0;
        const nbDirectFromList = savoirsCount(r.id!);
        const nbDirect = nbDirectFromComp || nbDirectFromList;
        return nbSc > 0
          ? <Tag color="geekblue" icon={<ApartmentOutlined />}>{nbSc} filles</Tag>
          : <Tag color="gold" icon={<BookOutlined />}>{nbDirect} directs</Tag>;
      },
    },
  ];
}

export function buildSavoirColumns(): TableColumnsType<Savoir> {
  return [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => (a.nom ?? "").localeCompare(b.nom ?? "") },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (value: string | undefined) => <span style={ellipsisStyle}>{value ?? "-"}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type: string) => <Tag color={type === "THEORIQUE" ? "purple" : "orange"}>{type}</Tag>,
      filters: TYPE_SAVOIR_OPTIONS.map((t) => ({ text: t, value: t })),
      onFilter: (v, r) => r.type === v,
    },
    {
      title: "Niveau",
      dataIndex: "niveau",
      key: "niveau",
      width: 140,
      render: (niveau: string) => {
        const opt = NIVEAU_SAVOIR_OPTIONS.find((n) => n.value === niveau);
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : <Tag>{niveau ?? "-"}</Tag>;
      },
      filters: NIVEAU_SAVOIR_OPTIONS.map((n) => ({ text: n.label, value: n.value })),
      onFilter: (v, r) => r.niveau === v,
    },
    {
      title: "Rattachement",
      key: "rattachement",
      render: (_: unknown, record) => {
        if (record.sousCompetenceNom) return <Tag color="cyan">SC: {record.sousCompetenceNom}</Tag>;
        if (record.competenceNom) return <Tag color="gold">Direct: {record.competenceNom}</Tag>;
        return <Tag>-</Tag>;
      },
    },
  ];
}
