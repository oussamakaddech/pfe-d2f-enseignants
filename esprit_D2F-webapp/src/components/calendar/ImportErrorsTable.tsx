import { Table, Tag, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ImportRowError } from "@/models/calendar";

interface Props {
  errors: ImportRowError[];
}

/** Tableau des erreurs/avertissements rattachés aux lignes du fichier. */
export default function ImportErrorsTable({ errors }: Readonly<Props>) {
  if (!errors || errors.length === 0) {
    return <Empty description="Aucune erreur détectée" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const columns: ColumnsType<ImportRowError> = [
    {
      title: "Ligne",
      dataIndex: "row",
      width: 90,
      sorter: (a, b) => a.row - b.row,
    },
    {
      title: "Champ",
      dataIndex: "field",
      width: 140,
    },
    {
      title: "Gravité",
      dataIndex: "severity",
      width: 130,
      filters: [
        { text: "Erreur", value: "ERROR" },
        { text: "Avertissement", value: "WARNING" },
      ],
      onFilter: (value, record) => record.severity === value,
      render: (severity: string) =>
        severity === "ERROR" ? (
          <Tag color="error">Erreur</Tag>
        ) : (
          <Tag color="warning">Avertissement</Tag>
        ),
    },
    {
      title: "Message",
      dataIndex: "message",
    },
  ];

  return (
    <Table<ImportRowError>
      size="small"
      rowKey={(r) => `${r.row}-${r.field}-${r.message}`}
      columns={columns}
      dataSource={errors}
      pagination={{ pageSize: 8, hideOnSinglePage: true }}
    />
  );
}
