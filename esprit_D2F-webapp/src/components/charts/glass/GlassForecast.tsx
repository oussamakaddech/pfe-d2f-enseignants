import { useMemo } from 'react';
import { Empty } from 'antd';
import type { DemandForecast, ForecastPoint } from '@/models/analyse';
import { brand, accent, neutral } from '@/styles/themes/tokens';

interface GlassForecastProps {
  readonly data?: DemandForecast;
  readonly height?: number;
}

/** Série historique + projection (pointillé) avec bande de confiance — SVG natif. */
export default function GlassForecast({ data, height = 240 }: GlassForecastProps) {
  const view = useMemo(() => {
    const hist = data?.history ?? [];
    const fc = data?.forecast ?? [];
    if (hist.length === 0) return null;

    const all: ForecastPoint[] = [...hist, ...fc];
    const n = all.length;
    const H = hist.length;
    const width = Math.max(360, n * 58);
    const padX = 38,
      padTop = 16,
      padBottom = 28;
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;
    const maxVal = Math.max(1, ...all.map((p) => Math.max(p.value, p.upper ?? 0)));
    const stepX = n > 1 ? innerW / (n - 1) : 0;
    const X = (i: number) => padX + i * stepX;
    const Y = (v: number) => padTop + innerH - (v / maxVal) * innerH;

    const histPts = hist.map((p, i) => `${X(i)},${Y(p.value)}`).join(' ');
    const fcPts = [hist[H - 1], ...fc].map((p, i) => `${X(H - 1 + i)},${Y(p.value)}`).join(' ');
    let band = '';
    if (fc.length > 0) {
      const upper = fc.map((p, i) => `${X(H + i)},${Y(p.upper ?? p.value)}`);
      const lower = fc.map((p, i) => `${X(H + i)},${Y(p.lower ?? p.value)}`).reverse();
      band = [`${X(H - 1)},${Y(hist[H - 1].value)}`, ...upper, ...lower].join(' ');
    }
    const labels = all.map((p, i) => ({ x: X(i), label: p.month, show: n <= 9 || i % 2 === 0 }));
    return { width, histPts, fcPts, band, labels, padTop, innerH, boundaryX: X(H - 1) };
  }, [data, height]);

  if (!view)
    return <Empty description={data?.note ?? 'Historique insuffisant pour une prévision'} />;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={view.width} height={height} role="img" aria-label="Prévision de la demande">
        {view.band && <polygon points={view.band} fill="rgba(0,180,216,0.14)" stroke="none" />}
        <line
          x1={view.boundaryX}
          y1={view.padTop}
          x2={view.boundaryX}
          y2={view.padTop + view.innerH}
          stroke={neutral[300]}
          strokeDasharray="3 3"
        />
        <polyline
          points={view.histPts}
          fill="none"
          stroke={brand[500]}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={view.fcPts}
          fill="none"
          stroke={accent[500]}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {view.labels.map(
          (l, i) =>
            l.show && (
              <text
                key={`${l.label}-${i}`}
                x={l.x}
                y={height - 8}
                fontSize={10}
                fill={neutral[500]}
                textAnchor="middle"
              >
                {l.label}
              </text>
            ),
        )}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: neutral[600], marginTop: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i
            style={{
              width: 14,
              height: 3,
              background: brand[500],
              display: 'inline-block',
              borderRadius: 2,
            }}
          />
          {' '}
          Historique
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i
            style={{
              width: 14,
              height: 3,
              background: accent[500],
              display: 'inline-block',
              borderRadius: 2,
            }}
          />
          {' '}
          Projection
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i
            style={{
              width: 14,
              height: 10,
              background: 'rgba(0,180,216,0.3)',
              display: 'inline-block',
              borderRadius: 2,
            }}
          />
          {' '}
          Intervalle de confiance
        </span>
      </div>
    </div>
  );
}
