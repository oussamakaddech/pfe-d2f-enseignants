import { Card, Col, Row, Statistic, Table, Tag, Alert, Empty, Spin } from 'antd';
import { usePilotage } from '@/hooks/analytics/useAnalyticsQueries';
import { TrainingImpactPanel } from '@/components/analytics';
import type { AlertEvent } from '@/models/analyse/analyticsFeature';
import { AppPageHeader } from '@/components/common';

/** Page de prévision institutionnelle (F9) — consomme GET /pilotage. */
export default function ForecastPage() {
  const { data, isLoading, isError } = usePilotage();

  return (
    <div style={{ padding: 24 }}>
      <AppPageHeader
        icon={null}
        title="Prévision institutionnelle"
        subtitle="Projection à 6 mois, positionnement des départements, anomalies live et corrélations besoins/gaps."
      />

      {isError && <Alert type="error" showIcon message="Échec du chargement de la prévision." />}
      {isLoading && <Spin style={{ display: 'block', margin: '32px auto' }} />}

      {data && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="Horizon (mois)" value={data.forecast_kpis.horizon_mois} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic title="Enseignants suivis" value={data.forecast_kpis.nb_enseignants} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Objectifs atteignables"
                  value={data.forecast_kpis.pct_objectifs_atteignables}
                  suffix="%"
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card>
                <Statistic
                  title="Compétences en régression"
                  value={data.forecast_kpis.nb_competences_regression}
                  valueStyle={{ color: '#c8102e' }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="Impact des formations suivies (historique réel)"
            style={{ marginBottom: 16, borderRadius: 12 }}
          >
            <TrainingImpactPanel />
          </Card>

          <Card
            title="Positionnement des départements"
            style={{ marginBottom: 16, borderRadius: 12 }}
          >
            <Table
              rowKey="departement_id"
              dataSource={data.benchmark_departements}
              pagination={false}
              size="small"
              columns={[
                { title: 'Département', dataIndex: 'departement_id' },
                {
                  title: 'Niveau moyen',
                  dataIndex: 'niveau_moyen',
                  render: (v: number) => `${Math.round(v * 100)}%`,
                },
                {
                  title: 'Écart vs cohorte',
                  dataIndex: 'ecart_vs_cohorte',
                  render: (v: number) => {
                    const sign = v > 0 ? '+' : '';
                    return (
                      <Tag color={v >= 0 ? 'green' : 'red'}>
                        {sign}
                        {Math.round(v * 100)} pts
                      </Tag>
                    );
                  },
                },
                { title: 'Enseignants', dataIndex: 'nb_enseignants' },
                {
                  title: 'Position',
                  dataIndex: 'position',
                  render: (p: string) => (
                    <Tag color={p === 'AU_DESSUS' ? 'green' : 'orange'}>{p}</Tag>
                  ),
                },
              ]}
            />
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Card title="Anomalies live" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Nouvelles anomalies (30 j)"
                  value={data.anomalies_live.nb_nouvelles}
                  valueStyle={{ color: '#c8102e' }}
                />
                {data.anomalies_live.alertes?.length ? (
                  <div style={{ marginTop: 8 }}>
                    {data.anomalies_live.alertes.slice(0, 5).map((a: AlertEvent) => (
                      <Tag key={a.id} color="red">
                        {a.type_alerte}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune anomalie" />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Corrélation besoins / gaps" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Coefficient de Pearson"
                  value={data.correlation_besoins_gaps.coefficient_pearson ?? 0}
                  precision={2}
                />
                <TypographyParagraph>
                  {data.correlation_besoins_gaps.interpretation}
                </TypographyParagraph>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

function TypographyParagraph({ children }: { readonly children: React.ReactNode }) {
  return <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>{children}</p>;
}
