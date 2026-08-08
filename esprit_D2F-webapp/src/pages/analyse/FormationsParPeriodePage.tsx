import { useMemo, useState, type ReactElement } from 'react';
import {
  Card,
  Col,
  Row,
  Segmented,
  Statistic,
  Typography,
  Empty,
  Button,
  Space,
  Tooltip,
  message,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useFormationsParPeriode, useAnalyticsExport } from '@/hooks/analyse/useReporting';
import type { Granularite, PeriodePoint, Tendance } from '@/models/analyse';

const { Title } = Typography;

const TREND_ICON: Record<Tendance, ReactElement> = {
  HAUSSE: <ArrowUpOutlined style={{ color: '#16a34a' }} />,
  BAISSE: <ArrowDownOutlined style={{ color: '#dc2626' }} />,
  STABLE: <MinusOutlined style={{ color: '#64748b' }} />,
};

/** Histogramme natif (SVG) : formations + participants par période. */
function PeriodeChart({
  data,
  height = 260,
}: {
  readonly data: readonly PeriodePoint[];
  readonly height?: number;
}) {
  const view = useMemo(() => {
    const width = Math.max(360, data.length * 80);
    const padX = 40,
      padY = 24;
    const maxVal = Math.max(
      1,
      ...data.map((d) => Math.max(d.nombreFormations, d.nombreParticipants)),
    );
    const innerW = width - padX * 2,
      innerH = height - padY * 2;
    const stepX = data.length ? innerW / data.length : 0;
    return { width, padX, padY, innerH, stepX, maxVal };
  }, [data, height]);

  if (!data.length) return <Empty description="Aucune formation sur la période" />;

  const barW = Math.min(22, view.stepX / 3);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={view.width} height={height} aria-label="Formations par période">
        {data.map((d, i) => {
          const cx = view.padX + i * view.stepX + view.stepX / 2;
          const hF = (d.nombreFormations / view.maxVal) * view.innerH;
          const hP = (d.nombreParticipants / view.maxVal) * view.innerH;
          const baseY = view.padY + view.innerH;
          return (
            <g key={d.label}>
              <rect
                x={cx - barW - 1}
                y={baseY - hF}
                width={barW}
                height={hF}
                fill="#1b5e20"
                rx={2}
              />
              <rect x={cx + 1} y={baseY - hP} width={barW} height={hP} fill="#66bb6a" rx={2} />
              <text x={cx} y={height - 6} textAnchor="middle" fontSize={10} fill="#64748b">
                {d.label.slice(0, 7)}
              </text>
            </g>
          );
        })}
      </svg>
      <Space size="large" style={{ marginTop: 8, fontSize: 13 }}>
        <span>
          <span
            style={{
              background: '#1b5e20',
              display: 'inline-block',
              width: 12,
              height: 12,
              marginRight: 6,
            }}
          />{' '}
          Formations
        </span>
        <span>
          <span
            style={{
              background: '#66bb6a',
              display: 'inline-block',
              width: 12,
              height: 12,
              marginRight: 6,
            }}
          />{' '}
          Participants
        </span>
      </Space>
    </div>
  );
}

export default function FormationsParPeriodePage() {
  const [granularite, setGranularite] = useState<Granularite>('MOIS');
  const { data, isLoading } = useFormationsParPeriode({ granularite });
  const { exporting, exportPdf } = useAnalyticsExport();

  const pdfExportSupported = granularite === 'MOIS' || granularite === 'ANNEE';
  const resolveExportTooltip = (): string | undefined => {
    if (pdfExportSupported) return undefined;
    if (granularite === 'SEMAINE') return "L'export PDF hebdomadaire n'est pas encore disponible.";
    return "L'export PDF trimestriel n'est pas encore disponible.";
  };
  const exportDisabledTooltip = resolveExportTooltip();

  function handleExportPdf() {
    const type = granularite === 'ANNEE' ? 'RAPPORT_ANNUEL' : 'RAPPORT_MENSUEL';
    exportPdf(type).catch(() => {
      message.error("Échec de l'export PDF.");
    });
  }

  const exportButton = (
    <Button
      icon={<DownloadOutlined />}
      loading={exporting}
      disabled={!pdfExportSupported}
      onClick={handleExportPdf}
    >
      Export PDF
    </Button>
  );

  return (
    <Card loading={isLoading}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Title level={3} style={{ margin: 0 }}>
          Formations par période
        </Title>
        <Space>
          <Segmented<Granularite>
            value={granularite}
            onChange={(v) => setGranularite(v)}
            options={[
              { label: 'Hebdo', value: 'SEMAINE' },
              { label: 'Mensuel', value: 'MOIS' },
              { label: 'Trimestriel', value: 'TRIMESTRE' },
              { label: 'Annuel', value: 'ANNEE' },
            ]}
          />
          {exportDisabledTooltip ? (
            <Tooltip title={exportDisabledTooltip}>{exportButton}</Tooltip>
          ) : (
            exportButton
          )}
        </Space>
      </Space>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Total formations" value={data?.totalFormations ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Moyenne / période"
              value={data?.moyenneParPeriode ?? 0}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tendance"
              value={data?.tendance ?? 'STABLE'}
              prefix={data ? TREND_ICON[data.tendance] : TREND_ICON.STABLE}
            />
          </Card>
        </Col>
      </Row>

      <PeriodeChart data={data?.periodes ?? []} />
    </Card>
  );
}
