import { useMemo } from 'react';
import { Empty } from 'antd';
import type { TrainingNeedsForecast } from '@/models/analyse';
import { brand, accent, neutral } from '@/styles/themes/tokens';

interface GlassTrainingNeedForecastProps {
  readonly data?: TrainingNeedsForecast;
  readonly height?: number;
}

const PALETTE = [brand[500], accent[500], '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const TOP_N = 5;

/** Prévision des besoins de formation : barres empilées par département sur les mois projetés. */
export default function GlassTrainingNeedForecast({
  data,
  height = 300,
}: GlassTrainingNeedForecastProps) {
  const view = useMemo(() => {
    if (!data?.total_forecast?.length) return null;

    const months = data.total_forecast.map((p) => p.month);
    const topDepts = data.top_departements ?? [];
    const others = (data.departements ?? [])
      .map((d) => d.departement)
      .filter((d) => !topDepts.includes(d));
    const series = [...topDepts, ...(others.length ? ['__autres__'] : [])];

    // value[deptIndex][monthIndex]
    const valueByDept: Record<string, number[]> = {};
    for (const d of data.departements ?? []) {
      if (topDepts.includes(d.departement)) {
        valueByDept[d.departement] = d.forecast.map((f) => f.value);
      }
    }
    if (others.length) {
      const agg = months.map((_, mi) =>
        (data.departements ?? [])
          .filter((d) => others.includes(d.departement))
          .reduce((s, d) => s + (d.forecast[mi]?.value ?? 0), 0),
      );
      valueByDept['__autres__'] = agg;
    }

    const n = months.length;
    const width = Math.max(360, n * 64);
    const padX = 38,
      padTop = 16,
      padBottom = 30;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const maxTotal = Math.max(1, ...data.total_forecast.map((p) => p.upper ?? p.value));
    const stepX = n > 1 ? innerW / n : 0;
    const barW = Math.min(46, stepX * 0.6);
    const Y = (v: number) => padTop + innerH - (v / maxTotal) * innerH;
    const CX = (i: number) => padX + stepX * (i + 0.5);

    return {
      width,
      months,
      series,
      valueByDept,
      n,
      padX,
      padTop,
      innerH,
      maxTotal,
      stepX,
      barW,
      Y,
      CX,
    };
  }, [data, height]);

  if (!view) {
    return <Empty description={data?.note ?? 'Pas de prévision des besoins disponible'} />;
  }

  const { width, months, series, valueByDept, maxTotal, barW, Y, CX } = view;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} role="img" aria-label="Prévision des besoins de formation">
        {/* grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = Y(maxTotal * f);
          return (
            <g key={f}>
              <line x1={38} y1={y} x2={width - 38} y2={y} stroke={neutral[200]} strokeWidth={1} />
              <text x={6} y={y + 3} fontSize={9} fill={neutral[400]}>
                {Math.round(maxTotal * f)}
              </text>
            </g>
          );
        })}
        {months.map((m, i) => {
          let acc = 0;
          return (
            <g key={m}>
              {series.map((dept, di) => {
                const v = valueByDept[dept]?.[i] ?? 0;
                const x = CX(i) - barW / 2;
                const yTop = Y(acc + v);
                const h = Y(acc) - Y(acc + v);
                acc += v;
                const color = dept === '__autres__' ? neutral[400] : PALETTE[di % PALETTE.length];
                return (
                  <rect
                    key={dept}
                    x={x}
                    y={yTop}
                    width={barW}
                    height={Math.max(0, h)}
                    fill={color}
                    rx={2}
                    opacity={0.9}
                  />
                );
              })}
              <text x={CX(i)} y={height - 10} fontSize={10} fill={neutral[500]} textAnchor="middle">
                {m}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: neutral[600],
          marginTop: 4,
        }}
      >
        {view.series.map((dept, di) => (
          <span key={dept} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i
              style={{
                width: 12,
                height: 10,
                background: dept === '__autres__' ? neutral[400] : PALETTE[di % PALETTE.length],
                display: 'inline-block',
                borderRadius: 2,
              }}
            />
            {dept === '__autres__' ? 'Autres' : dept}
          </span>
        ))}
      </div>
    </div>
  );
}
