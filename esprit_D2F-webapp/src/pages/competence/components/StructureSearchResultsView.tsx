import { Card, Descriptions, Empty, Space, Tag, Typography } from "antd";
import { ApartmentOutlined, BookOutlined, BulbOutlined, FolderOpenOutlined } from "@ant-design/icons";

interface SearchDomaine { id?: string | number; code?: string; nom?: string; }
interface SearchCompetence { id?: string | number; code?: string; nom?: string; domaineNom?: string; description?: string; }
interface SearchSousComp { id?: string | number; code?: string; nom?: string; competenceNom?: string; description?: string; }
interface SearchSavoir { id?: string | number; code?: string; nom?: string; type?: string; sousCompetenceNom?: string; competenceNom?: string; description?: string; }

export interface SearchResults {
  domaines?: SearchDomaine[];
  competences?: SearchCompetence[];
  sousCompetences?: SearchSousComp[];
  savoirs?: SearchSavoir[];
}

export default function StructureSearchResultsView({ results }: Readonly<{ results: SearchResults }>) {
  const { domaines = [], competences = [], sousCompetences = [], savoirs = [] } = results;
  const hasResults = domaines.length || competences.length || sousCompetences.length || savoirs.length;

  if (!hasResults) return <Empty description="Aucun résultat trouvé" />;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {domaines.length > 0 && (
        <Card size="small" title={<><FolderOpenOutlined /> Domaines ({domaines.length})</>}>
          {domaines.map((d) => (
            <Tag key={d.id} color="blue" style={{ margin: 4, padding: "4px 8px" }}>
              <strong>{d.code}</strong> — {d.nom}
            </Tag>
          ))}
        </Card>
      )}
      {competences.length > 0 && (
        <Card size="small" title={<><ApartmentOutlined /> Compétences ({competences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {competences.map((c) => (
              <Descriptions.Item key={c.id} label={<Tag color="green">{c.code}</Tag>}>
                <strong>{c.nom}</strong>
                {c.domaineNom && <Typography.Text type="secondary"> — {c.domaineNom}</Typography.Text>}
                {c.description && <div><Typography.Text type="secondary">{c.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
      {sousCompetences.length > 0 && (
        <Card size="small" title={<><BulbOutlined /> Compétences filles ({sousCompetences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {sousCompetences.map((sc) => (
              <Descriptions.Item key={sc.id} label={<Tag color="orange">{sc.code}</Tag>}>
                <strong>{sc.nom}</strong>
                {sc.competenceNom && <Typography.Text type="secondary"> — {sc.competenceNom}</Typography.Text>}
                {sc.description && <div><Typography.Text type="secondary">{sc.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
      {savoirs.length > 0 && (
        <Card size="small" title={<><BookOutlined /> Savoirs ({savoirs.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {savoirs.map((s) => (
              <Descriptions.Item
                key={s.id}
                label={(
                  <Space>
                    <Tag>{s.code}</Tag>
                    <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                      {s.type === "THEORIQUE" ? "Th." : "Pr."}
                    </Tag>
                  </Space>
                )}
              >
                <strong>{s.nom}</strong>
                {s.sousCompetenceNom && <Typography.Text type="secondary"> — {s.sousCompetenceNom}</Typography.Text>}
                {s.competenceNom && <Typography.Text type="secondary"> — {s.competenceNom}</Typography.Text>}
                {s.description && <div><Typography.Text type="secondary">{s.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}







