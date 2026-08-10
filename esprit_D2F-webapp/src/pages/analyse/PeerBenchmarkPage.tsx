import { useState } from 'react';
import { Card, Section } from '@/redesign/components/Section';
import { KpiSkeleton, ErrorState } from '@/redesign/components/States';
import { useBenchmark } from '@/hooks/analyse/useNewFeatures';
import { useAuth } from '@/hooks/auth/useAuth';
import { normalizeRole } from '@/utils/constants/roles';
import { InputNumber, Switch, Tag, Empty, Progress, Statistic } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

function MetricRow({
  label,
  metric,
  suffix = '',
  higherIsBetter = true,
}: {
  readonly label: string;
  readonly metric: {
    readonly self: number;
    readonly pairs_moyen: number;
    readonly percentile: number;
  };
  readonly suffix?: string;
  readonly higherIsBetter?: boolean;
}) {
  const pct = metric.percentile;
  const good = higherIsBetter ? pct >= 50 : pct <= 50;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span>{label}</span>
        <Tag color={good ? 'success' : 'warning'}>{pct.toFixed(0)}ᵉ percentile</Tag>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Statistic value={metric.self} suffix={suffix} valueStyle={{ fontSize: 20 }} />
        <span style={{ color: 'var(--rd-muted)' }}>
          vs pairs {metric.pairs_moyen.toFixed(2)}
          {suffix}
        </span>
      </div>
      <Progress
        percent={Math.min(100, Math.max(0, pct))}
        showInfo={false}
        strokeColor={good ? '#52c41a' : '#faad14'}
      />
    </div>
  );
}

export default function PeerBenchmarkPage() {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [enseignantId, setEnseignantId] = useState<string | null>(
    user?.id ? String(user.id) : null,
  );
  const [parUp, setParUp] = useState(false);

  const { data, isLoading, isError, refetch } = useBenchmark(enseignantId, parUp);

  return (
    <div style={{ padding: 24 }}>
      <Section
        title="Benchmark vs pairs"
        subtitle="Positionnement de l'enseignant par rapport à ses pairs (département / UP)"
        extra={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {roleKey === 'enseignant' ? null : (
              <InputNumber
                placeholder="ID enseignant"
                value={enseignantId ?? undefined}
                onChange={(v) => setEnseignantId(v == null ? null : String(v))}
                style={{ width: 160 }}
              />
            )}
            <span>Restreindre à l'UP</span>
            <Switch checked={parUp} onChange={setParUp} />
          </div>
        }
      >
        {isLoading && <KpiSkeleton />}
        {isError && (
          <ErrorState message="Erreur de chargement du benchmark." onRetry={() => refetch()} />
        )}
        {data && !data.disponible && (
          <Empty description={data.raison ?? 'Benchmark indisponible'} />
        )}
        {data && data.disponible && (
          <Card title={`Cohorte : ${data.pairs} pairs (${data.scope})`} icon={<TeamOutlined />}>
            <MetricRow label="Niveau moyen de compétence" metric={data.niveau_moyen} />
            <MetricRow label="Taux de complétion" metric={data.taux_completion} suffix="%" />
            <MetricRow label="Score de risque" metric={data.score_risque} higherIsBetter={false} />
            <MetricRow label="Gaps critiques" metric={data.gaps_critiques} />
          </Card>
        )}
      </Section>
    </div>
  );
}
