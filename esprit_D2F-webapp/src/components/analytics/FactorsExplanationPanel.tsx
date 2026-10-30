import { Card, List, Progress, Tag, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { RiskFactor } from '@/models/analyse/analyticsFeature';

interface FactorsExplanationPanelProps {
  readonly facteurs: RiskFactor[] | undefined;
  readonly loading?: boolean;
}

function FactorRow({ f }: { readonly f: RiskFactor }) {
  if (f.categorie === 'PROBABILITE_ML') {
    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text strong>{f.nom}</Typography.Text>
          <Tag color="purple">{(f.valeur_brute * 100).toFixed(0)}% (prob.)</Tag>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <InfoCircleOutlined /> Probabilité calculée par le classifier ML — ne contribue pas
          directement au score.
        </Typography.Text>
      </div>
    );
  }
  const contribPct = Math.min(
    100,
    Math.round(Math.abs(f.contribution_percent ?? f.contribution * 100)),
  );
  const rawValue = f.valeur_brute % 1 === 0 ? f.valeur_brute : f.valeur_brute.toFixed(2);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text strong>{f.nom}</Typography.Text>
        <Tag color="blue">poids {(f.poids * 100).toFixed(0)}%</Tag>
      </div>
      <Tooltip title={f.explication}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={contribPct}
            size="small"
            strokeColor={f.contribution >= 0 ? '#f5222d' : '#52c41a'}
            style={{ flex: 1 }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined /> valeur {rawValue} · contribution{' '}
            {f.contribution_percent ?? Math.round(f.contribution * 100)}%
          </Typography.Text>
        </div>
      </Tooltip>
    </div>
  );
}

/** Panneau explicatif : sépare les probabilités du classifier ML des facteurs du score. */
export default function FactorsExplanationPanel({
  facteurs,
  loading,
  levelLabel,
}: Readonly<{ facteurs: RiskFactor[] | undefined; loading?: boolean; levelLabel?: string }>) {
  const list = facteurs ?? [];
  const probas = list.filter((f) => f.categorie === 'PROBABILITE_ML');
  const facteursScore = list.filter((f) => f.categorie !== 'PROBABILITE_ML');
  const topProba = probas.length
    ? probas.reduce((a, b) => (b.valeur_brute > a.valeur_brute ? b : a), probas[0])
    : null;

  return (
    <Card
      loading={loading}
      title="Explication du score (facteurs pondérés)"
      style={{ borderRadius: 12 }}
    >
      {list.length === 0 ? (
        <Typography.Text type="secondary">Aucun facteur disponible.</Typography.Text>
      ) : (
        <>
          {probas.length > 0 && (
            <>
              <Typography.Text strong type="secondary" style={{ fontSize: 12 }}>
                Classifier ML
              </Typography.Text>
              <List
                dataSource={probas}
                renderItem={(f) => (
                  <List.Item>
                    <FactorRow f={f} />
                  </List.Item>
                )}
              />
              {topProba && (
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Classe ML la plus probable : {topProba.nom.replace(/^Probabilité classe\s*/i, '')}
                </Typography.Text>
              )}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                Le niveau {levelLabel ?? 'Critique'} provient du score métier pondéré. Le classifier
                ML estime uniquement des probabilités de classes.
              </Typography.Text>
            </>
          )}
          {facteursScore.length > 0 && (
            <>
              {probas.length > 0 && (
                <Typography.Text strong type="secondary" style={{ fontSize: 12 }}>
                  Facteurs du score
                </Typography.Text>
              )}
              <List
                dataSource={facteursScore}
                renderItem={(f) => (
                  <List.Item>
                    <FactorRow f={f} />
                  </List.Item>
                )}
              />
            </>
          )}
        </>
      )}
    </Card>
  );
}
