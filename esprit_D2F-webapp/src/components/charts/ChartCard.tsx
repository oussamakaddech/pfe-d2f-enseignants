import { memo, useRef, useState, type ReactNode } from 'react';
import { Button, Dropdown, Segmented, Tooltip } from 'antd';
import { DownloadOutlined, InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';

import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/common/EmptyState';
import styles from './ChartCard.module.css';

export type TimeRange = 'semaine' | 'mois' | 'trimestre' | 'annee';

const RANGE_OPTIONS = [
  { label: 'Semaine', value: 'semaine' },
  { label: 'Mois', value: 'mois' },
  { label: 'Trimestre', value: 'trimestre' },
  { label: 'Année', value: 'annee' },
] as const;

interface ChartCardProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Texte du tooltip (?) d'aide. */
  readonly info?: string;
  readonly children: ReactNode;
  readonly loading?: boolean;
  /** true quand la requête a abouti mais sans données exploitables. */
  readonly empty?: boolean;
  readonly emptyMessage?: string;
  readonly height?: number;
  /** Active les onglets Semaine/Mois/Trimestre/Année. */
  readonly timeRange?: TimeRange;
  readonly onTimeRangeChange?: (range: TimeRange) => void;
  /** Données tabulaires pour l'export CSV. */
  readonly csv?: { headers: string[]; rows: (string | number)[][] };
  readonly exportFileName?: string;
  readonly actions?: ReactNode;
}

/**
 * Conteneur standard de graphique : titre + sous-titre + aide, sélecteur de
 * période, export PNG/CSV, skeleton de chargement et état vide contextualisé.
 * AUCUN chart ne s'affiche sans skeleton loader.
 */
const ChartCard = memo(function ChartCard({
  title,
  subtitle,
  info,
  children,
  loading = false,
  empty = false,
  emptyMessage = 'Données insuffisantes pour la période sélectionnée.',
  height = 300,
  timeRange,
  onTimeRangeChange,
  csv,
  exportFileName = 'graphique-d2f',
  actions,
}: ChartCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const exportPng = () => {
    const canvas = bodyRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${exportFileName}.png`;
    link.href = canvas.toDataURL('image/png', 1);
    link.click();
  };

  const exportCsv = () => {
    if (!csv) return;
    setExporting(true);
    try {
      const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
      const lines = [
        csv.headers.map(escape).join(';'),
        ...csv.rows.map((r) => r.map(escape).join(';')),
      ];
      const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${exportFileName}.csv`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportItems = [
    { key: 'png', label: 'Image PNG', onClick: exportPng },
    ...(csv ? [{ key: 'csv', label: 'Données CSV', onClick: exportCsv }] : []),
  ];

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.titles}>
          <h3 className={styles.title}>
            {title}
            {info && (
              <Tooltip title={info}>
                <InfoCircleOutlined className={styles.infoIcon} />
              </Tooltip>
            )}
          </h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        <div className={styles.controls}>
          {actions}
          {timeRange && onTimeRangeChange && (
            <Segmented
              size="small"
              value={timeRange}
              onChange={(v) => onTimeRangeChange(v as TimeRange)}
              options={[...RANGE_OPTIONS]}
            />
          )}
          {!loading && !empty && (
            <Dropdown menu={{ items: exportItems }} trigger={['click']}>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={exporting}
                aria-label="Exporter"
              />
            </Dropdown>
          )}
        </div>
      </header>

      <div ref={bodyRef} className={styles.body} style={{ minHeight: height }}>
        {loading && <Skeleton variant="chart" height={height} />}
        {!loading && empty && (
          <EmptyState
            compact
            icon={<InboxOutlined />}
            title="Aucune donnée"
            description={emptyMessage}
          />
        )}
        {!loading && !empty && children}
      </div>
    </section>
  );
});

export default ChartCard;
