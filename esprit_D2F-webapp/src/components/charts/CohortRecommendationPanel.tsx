import { useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Empty,
  Spin,
  Typography,
  Select,
  Statistic,
  Row,
  Col,
  Tooltip,
  InputNumber,
} from 'antd';
import {
  TeamOutlined,
  BulbOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { BatchRecommendationResponse, TeacherRiskIndicator } from '@/models/analyse';
const { Text, Title } = Typography;

interface CohortRecommendationPanelProps {
  readonly teachers: TeacherRiskIndicator[];
  readonly teachersLoading: boolean;
  readonly onGenerate: (
    teacherIds: string[],
    topN: number,
  ) => Promise<BatchRecommendationResponse | undefined>;
  readonly onExport?: (data: BatchRecommendationResponse | undefined) => void;
}

function FormationTypeTag({ type }: { readonly type: string | null }) {
  if (!type) return <Tag>—</Tag>;
  const config: Record<string, { color: string; label: string }> = {
    INTERNE: { color: 'blue', label: 'Interne' },
    EXTERNE: { color: 'purple', label: 'Externe' },
    EN_LIGNE: { color: 'cyan', label: 'En ligne' },
  };
  const c = config[type] || { color: 'default', label: type };
  return <Tag color={c.color}>{c.label}</Tag>;
}

export default function CohortRecommendationPanel({
  teachers,
  teachersLoading,
  onGenerate,
  onExport,
}: CohortRecommendationPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [topN, setTopN] = useState<number>(10);
  const [result, setResult] = useState<BatchRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const data = await onGenerate(selectedIds, topN);
      setResult(data || null);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<NonNullable<BatchRecommendationResponse>['recommendations'][number]> =
    [
      {
        title: '#',
        key: 'rank',
        width: 50,
        render: (_, __, index) => (
          <Text
            strong
            style={{
              color: index < 3 ? '#b51200' : undefined,
            }}
          >
            {index + 1}
          </Text>
        ),
      },
      {
        title: 'Formation',
        dataIndex: 'formation_titre',
        ellipsis: { showTitle: false },
        render: (v: string) => (
          <Tooltip title={v}>
            <Text strong>{v}</Text>
          </Tooltip>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'formation_type',
        width: 100,
        render: (v: string | null) => <FormationTypeTag type={v} />,
      },
      {
        title: 'Enseignants Concernés',
        dataIndex: 'nb_enseignants_concernes',
        width: 140,
        align: 'center' as const,
        sorter: (a, b) => a.nb_enseignants_concernes - b.nb_enseignants_concernes,
        defaultSortOrder: 'descend',
        render: (v: number) => {
          let tagColor: string;
          if (v >= selectedIds.length * 0.5) {
            tagColor = 'green';
          } else if (v >= selectedIds.length * 0.2) {
            tagColor = 'blue';
          } else {
            tagColor = 'default';
          }
          return (
            <Tag color={tagColor}>
              <TeamOutlined /> {v}/{selectedIds.length}
            </Tag>
          );
        },
      },
      {
        title: 'Prob. Réussite Moy.',
        dataIndex: 'probabilite_reussite_moyenne',
        width: 140,
        sorter: (a, b) => a.probabilite_reussite_moyenne - b.probabilite_reussite_moyenne,
        render: (v: number) => {
          const pct = Math.round(v * 100);
          let color: string;
          if (pct >= 80) {
            color = '#10b981';
          } else if (pct >= 60) {
            color = '#f59e0b';
          } else {
            color = '#ef4444';
          }
          return (
            <Text strong style={{ color }}>
              {pct}%
            </Text>
          );
        },
      },
      {
        title: 'Score Global',
        dataIndex: 'score_global_moyen',
        width: 110,
        render: (v: number) => {
          let tagColor: string;
          if (v >= 0.8) {
            tagColor = 'green';
          } else if (v >= 0.5) {
            tagColor = 'blue';
          } else {
            tagColor = 'default';
          }
          return <Tag color={tagColor}>{(v * 100).toFixed(0)}%</Tag>;
        },
      },
      {
        title: 'Compétences',
        dataIndex: 'competences_ciblees',
        width: 150,
        render: (v: number[]) => (
          <Space size={2} wrap>
            {v.slice(0, 3).map((c) => (
              <Tag key={c} style={{ fontSize: 11 }}>
                C{c}
              </Tag>
            ))}
            {v.length > 3 && (
              <Tooltip
                title={v
                  .slice(3)
                  .map((c) => `C${c}`)
                  .join(', ')}
              >
                <Tag>+{v.length - 3}</Tag>
              </Tooltip>
            )}
          </Space>
        ),
      },
    ];

  const handleExport = () => {
    if (onExport) onExport(result || undefined);
  };

  return (
    <Card
      variant="borderless"
      title={
        <Space>
          <BulbOutlined style={{ color: '#10b981' }} />
          <span>Recommandations par Cohorte</span>
        </Space>
      }
    >
      {/* ── Selection ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: 6 }}>
            <Text strong>
              <UserAddOutlined /> Sélectionner des enseignants ({selectedIds.length} sélectionné(s))
            </Text>
          </div>
          <Select
            mode="multiple"
            placeholder="Rechercher et sélectionner des enseignants..."
            value={selectedIds}
            onChange={setSelectedIds}
            loading={teachersLoading}
            style={{ width: '100%' }}
            size="large"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={teachers.map((t) => ({
              value: t.teacher_id,
              label: `${t.teacher_name} (${t.teacher_id})`,
            }))}
            notFoundContent={teachersLoading ? <Spin size="small" /> : 'Aucun enseignant trouvé'}
          />
        </Col>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6 }}>
            <Text strong>Top N formations</Text>
          </div>
          <InputNumber
            min={1}
            max={50}
            value={topN}
            onChange={(v) => setTopN(v || 10)}
            style={{ width: '100%' }}
            size="large"
          />
        </Col>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6 }}> </div>
          <Button
            type="primary"
            size="large"
            block
            icon={<BarChartOutlined />}
            onClick={handleGenerate}
            loading={loading}
            disabled={selectedIds.length === 0}
          >
            Générer
          </Button>
        </Col>
      </Row>

      {/* ── Results ── */}
      <Spin spinning={loading}>
        {result ? (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Statistic
                  title="Enseignants analysés"
                  value={result.nb_enseignants}
                  prefix={<TeamOutlined style={{ color: '#b51200' }} />}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Recommandations"
                  value={result.recommendations.length}
                  prefix={<BulbOutlined style={{ color: '#10b981' }} />}
                />
              </Col>
              <Col xs={8}>
                <Statistic
                  title="Couverture"
                  value={
                    result.nb_enseignants > 0
                      ? Math.round(
                          (result.recommendations.filter((r) => r.nb_enseignants_concernes > 0)
                            .length /
                            result.recommendations.length) *
                            100,
                        )
                      : 0
                  }
                  suffix="%"
                  prefix={<CheckCircleOutlined style={{ color: '#3b82f6' }} />}
                />
              </Col>
            </Row>

            <Table
              dataSource={result.recommendations}
              columns={columns}
              rowKey="formation_id"
              size="small"
              pagination={{ pageSize: 10, showTotal: (t) => `${t} formation(s)` }}
              scroll={{ x: 900 }}
            />

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                Exporter les résultats
              </Button>
            </div>
          </>
        ) : (
          <Empty
            description="Sélectionnez des enseignants et cliquez sur Générer pour obtenir des recommandations agrégées"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Spin>
    </Card>
  );
}
