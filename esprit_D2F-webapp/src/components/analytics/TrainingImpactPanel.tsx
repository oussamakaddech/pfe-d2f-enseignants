import { Card, Table, Tag, Statistic, Space, Empty, Spin } from 'antd';
import {
  useTrainingImpact,
  useTrainingImpactFormations,
} from '@/hooks/analytics/useAnalyticsQueries';

/**
 * Impact institutionnel des formations suivies (F8 — vue consolidée).
 * Agrégats historiques réels + classement des formations par gain de niveau.
 */
export default function TrainingImpactPanel() {
  const impact = useTrainingImpact();
  const tops = useTrainingImpactFormations(0, 10);

  if (impact.isLoading || tops.isLoading) {
    return <Spin style={{ display: 'block', margin: '24px auto' }} />;
  }

  const d = impact.data;
  if (!d) return <Empty description="Aucune donnée d'impact disponible" />;

  return (
    <div>
      <Space size="large" wrap style={{ marginBottom: 16 }}>
        <Statistic title="Enseignants suivis" value={d.nb_enseignants_suivis} />
        <Statistic title="Formations suivies" value={d.nb_formations_suivies} />
        <Statistic
          title="Gain de niveau moyen"
          value={d.gain_niveau_moyen.toFixed(2)}
          suffix="pts"
        />
        <Statistic
          title="Réduction de l'indice de risque"
          value={`${Math.round(d.reduction_risque_moyenne * 100)} pts`}
          valueStyle={{ color: '#52c41a' }}
        />
        <Statistic
          title="Risques réduits"
          value={d.nb_risque_reduit}
          valueStyle={{ color: '#52c41a' }}
        />
        <Statistic
          title="Risques augmentés"
          value={d.nb_risque_augmente}
          valueStyle={{ color: '#f5222d' }}
        />
      </Space>

      <Card
        size="small"
        style={{ borderRadius: 12 }}
        title="Top formations par impact (gain de niveau moyen)"
      >
        <Table
          size="small"
          pagination={false}
          rowKey={(r) => r.formation_id}
          dataSource={tops.data?.formations ?? []}
          columns={[
            { title: 'Formation', dataIndex: 'formation_titre' },
            {
              title: 'Type',
              dataIndex: 'formation_type',
              render: (t: string | null) => (t ? <Tag>{t}</Tag> : '—'),
            },
            { title: 'Enseignants', dataIndex: 'nb_enseignants' },
            {
              title: 'Gain niveau moyen',
              dataIndex: 'gain_niveau_moyen',
              render: (v: number) => <Tag color="green">+{v.toFixed(2)}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}
