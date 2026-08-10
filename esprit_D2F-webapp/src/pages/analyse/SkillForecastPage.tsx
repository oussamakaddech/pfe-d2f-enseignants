import { useMemo, useState } from 'react';
import { Card, Section } from '@/redesign/components/Section';
import { KpiSkeleton, ErrorState } from '@/redesign/components/States';
import { useForecast } from '@/hooks/analyse/useNewFeatures';
import { useAuth } from '@/hooks/auth/useAuth';
import { normalizeRole } from '@/utils/constants/roles';
import { InputNumber, Slider, Tag, Empty, Table } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';

const W = 640,
  H = 260,
  padX = 40,
  padY = 24;
const innerW = W - padX * 2,
  innerH = H - padY * 2;

function ForecastSvg({ data }: { readonly data: ReturnType<typeof useForecast>['data'] }) {
  if (!data) return null;
  const series = data.global as {
    mois: number;
    niveau_prevu: number;
    borne_basse: number;
    borne_haute: number;
  }[];
  if (series.length === 0) return <Empty description="Aucune prévision" />;
  const max = 5;
  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xOf = (i: number) => padX + i * stepX;
  const yOf = (v: number) => padY + innerH - (v / max) * innerH;

  const line = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(p.niveau_prevu).toFixed(1)}`)
    .join(' ');
  const bandTop = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(p.borne_haute).toFixed(1)}`)
    .join(' ');
  const bandBottom = [...series]
    .reverse()
    .map((p) => `L ${xOf(series.indexOf(p))} ${yOf(p.borne_basse).toFixed(1)}`)
    .join(' ');
  const band = `${bandTop} ${bandBottom} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Prévision du niveau moyen">
      <defs>
        <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1677ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#1677ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((t) => {
        const y = yOf(t);
        return (
          <g key={t}>
            <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="var(--rd-border)" strokeWidth={1} />
            <text x={padX - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--rd-muted)">
              {t}
            </text>
          </g>
        );
      })}
      <path d={band} fill="url(#fc-band)" />
      <path d={line} fill="none" stroke="#1677ff" strokeWidth={2.5} />
      {series.map((p, i) => (
        <circle key={p.mois} cx={xOf(i)} cy={yOf(p.niveau_prevu)} r={2.5} fill="#1677ff" />
      ))}
    </svg>
  );
}

export default function SkillForecastPage() {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [enseignantId, setEnseignantId] = useState<string | null>(
    user?.id ? String(user.id) : null,
  );
  const [horizon, setHorizon] = useState(6);

  const { data, isLoading, isError, refetch } = useForecast(enseignantId, { horizonMois: horizon });

  const columns = useMemo(
    () => [
      { title: 'Compétence', dataIndex: 'competence_nom', key: 'competence_nom' },
      {
        title: 'Actuel',
        dataIndex: 'niveau_actuel',
        key: 'niveau_actuel',
        render: (v: number) => <Tag color="default">{v.toFixed(1)}</Tag>,
      },
      {
        title: 'Requis',
        dataIndex: 'niveau_requis',
        key: 'niveau_requis',
        render: (v: number) => <Tag color="blue">{v.toFixed(1)}</Tag>,
      },
      {
        title: 'Prévu (final)',
        dataIndex: 'niveau_prevu_final',
        key: 'niveau_prevu_final',
        render: (v: number) => <Tag color="green">{v.toFixed(2)}</Tag>,
      },
      {
        title: 'Écart restant',
        dataIndex: 'ecart_restant',
        key: 'ecart_restant',
        render: (v: number) => v.toFixed(2),
      },
      {
        title: 'Objectif atteint ?',
        dataIndex: 'comblera_objectif',
        key: 'comblera_objectif',
        render: (b: boolean) =>
          b ? <Tag color="success">Oui</Tag> : <Tag color="warning">Non</Tag>,
      },
      {
        title: 'Régression',
        dataIndex: 'en_regression',
        key: 'en_regression',
        render: (b: boolean) => (b ? <Tag color="error">Oui</Tag> : <Tag color="default">Non</Tag>),
      },
    ],
    [],
  );

  return (
    <div style={{ padding: 24 }}>
      <Section
        title="Prévision des niveaux de compétence"
        subtitle="Projection temporelle sur N mois avec intervalle de confiance (PFE)"
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
            <Slider
              min={1}
              max={36}
              value={horizon}
              onChange={setHorizon}
              style={{ width: 160 }}
              tooltip={{ formatter: (v) => `${v} mois` }}
            />
          </div>
        }
      >
        {isLoading && <KpiSkeleton />}
        {isError && (
          <ErrorState message="Erreur de chargement de la prévision." onRetry={() => refetch()} />
        )}
        {data && (
          <>
            <Card title="Niveau moyen projeté" icon={<LineChartOutlined />}>
              <ForecastSvg data={data} />
              <div style={{ marginTop: 8, color: 'var(--rd-muted)', fontSize: 12 }}>
                Pente mensuelle : {data.pente_mensuelle.toFixed(4)} niv/mois · Incertitude σ :{' '}
                {data.incertitude_sigma.toFixed(2)} · Points historiques :{' '}
                {data.nb_points_historiques}
              </div>
            </Card>
            <Card title="Détail par compétence">
              <Table
                rowKey="competence_id"
                size="small"
                pagination={false}
                columns={columns}
                dataSource={data.competences}
              />
            </Card>
          </>
        )}
        {!data && !isLoading && !isError && <Empty description="Sélectionnez un enseignant" />}
      </Section>
    </div>
  );
}
