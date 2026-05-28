// EnseignantCompTable — enseignant → competences mapping table for ReportStep.
// Extracted from ReportStep.tsx for DSI 200-line compliance.

import { Button, Card, Space, Table, Tag, Typography } from "antd";
import { EditOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface SavoirEntry { nom: string; code: string; gcCodes: string[]; label?: string }
interface EnseignantRow { key: string; name: string; initials: string; savoirs: SavoirEntry[]; allGcCodes: string[] }

interface EnseignantCompTableProps {
  rows: EnseignantRow[];
  setCurrentStep: (step: number) => void;
}

export default function EnseignantCompTable({ rows, setCurrentStep }: Readonly<EnseignantCompTableProps>) {
  if (rows.length === 0) return null;

  const columns = [
    {
      title: "Enseignant",
      dataIndex: "name",
      key: "name",
      width: 180,
      render: (name: string, row: EnseignantRow) => (
        <Space>
          <Tag color="blue" style={{ fontWeight: 700, minWidth: 38, textAlign: "center" }}>{row.initials}</Tag>
          <Text style={{ fontSize: 13 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Compétences techniques associées",
      dataIndex: "allGcCodes",
      key: "gcCodes",
      render: (codes: string[]) => <Text style={{ fontSize: 13 }}>{codes.join(" ; ")}</Text>,
    },
    {
      title: "Nb savoirs",
      key: "count",
      width: 90,
      align: "center" as const,
      render: (_: unknown, row: EnseignantRow) => <Tag color="cyan" style={{ fontWeight: 700 }}>{row.allGcCodes.length}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 100,
      align: "center" as const,
      render: () => <Button size="small" type="link" icon={<EditOutlined />} onClick={() => setCurrentStep(2)}>Modifier</Button>,
    },
  ];

  return (
    <Card title={<Space><UserOutlined /> Enseignants — Compétences techniques associées</Space>} size="small" className="rice-table-card" style={{ marginBottom: 16 }}>
      <Table dataSource={rows} columns={columns} size="small" pagination={false} bordered={false} />
    </Card>
  );
}

// Builder helpers used by ReportStep to construct EnseignantRow[]
const shortenCode = (code: string) => { const parts = (code || "").split("-"); return parts.length > 2 ? parts.slice(2).join("-") : code; };

export function buildEnseignantSavoirsMap(allSavoirsFlat: Record<string, unknown>[]) {
  const ensSavoirsMap = new Map<string, SavoirEntry[]>();
  allSavoirsFlat.forEach((s) => {
    (s.enseignantsSuggeres as unknown[] ?? []).forEach((eid) => {
      const key = String(eid);
      if (!ensSavoirsMap.has(key)) ensSavoirsMap.set(key, []);
      const gcCodes = (s.gcCodes && (s.gcCodes as string[]).length > 0) ? s.gcCodes as string[] : [shortenCode(s.code as string)];
      ensSavoirsMap.get(key)!.push({ nom: s.nom as string, code: s.code as string, gcCodes, label: s.label as string });
    });
  });
  return ensSavoirsMap;
}

export function buildEnseignantRows(
  ensSavoirsMap: Map<string, SavoirEntry[]>,
  extractedNameMap: Map<string, string>,
  effectiveEnseignants: Record<string, unknown>[],
): EnseignantRow[] {
  return Array.from(ensSavoirsMap.entries()).map(([eid, savoirs]) => {
    const extractedName = extractedNameMap.get(eid);
    const ensObj = extractedName ? null : effectiveEnseignants.find((e) => String(e.id ?? e.enseignantId) === eid);
    let resolvedName = eid;
    if (ensObj) resolvedName = ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : ensObj.nom as string;
    const name = extractedName ?? resolvedName;
    const initials = name === eid ? eid.slice(0, 2).toUpperCase() : name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    const allGcCodes = [...new Set(savoirs.flatMap((sv) => sv.gcCodes))];
    return { key: eid, name, initials, savoirs, allGcCodes };
  });
}
