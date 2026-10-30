import { useMemo, useState } from 'react';
import { Button, Card, Col, Row, Select, Space, Statistic, Table } from 'antd';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import dayjs from 'dayjs';
import { BarChartOutlined, FileExcelOutlined } from '@ant-design/icons';
import { AppPageHeader } from '@/components/common';
import { BarChart, ChartCard, DonutChart, cardTooltip } from '@/components/charts';
import { useFeedbackStats } from '@/hooks/evaluation/useFormationFeedback';
import { useAllFormations } from '@/hooks/formation/useFormations';
import FormationFeedbackService, {
  ASPECTS,
  NIVEAUX_SATISFACTION,
} from '@/services/evaluation/FormationFeedbackService';
import { exportFeedbackExcel } from '@/utils/evaluation/exportFeedbackExcel';
import useAppNotification from '@/hooks/ui/useAppNotification';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/** Couleurs des 5 niveaux (du moins au plus satisfaisant), comme dans Microsoft Forms. */
const NIVEAU_COLORS = ['#e8604c', '#f0a04b', '#9ca3af', '#5b7fa6', '#2f5fb3'];

/** Libellé d'axe court (le titre complet reste dans l'export CSV et le tableau). */
const court = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

/**
 * Statistiques anonymes du questionnaire de satisfaction (ADMIN) : répartition
 * des 5 niveaux par aspect (barres empilées à 100 %), moyennes, besoin de
 * formation complémentaire, réponses par formation et par UP, remarques libres.
 */
export default function EvaluationStatsPage() {
  const [formationId, setFormationId] = useState<number | undefined>();
  const { data: stats, isLoading } = useFeedbackStats(formationId);
  const { data: allStats } = useFeedbackStats();
  const { data: formations = [] } = useAllFormations();

  const titre = useMemo(() => {
    const map = new Map<number, string>();
    formations.forEach((f) => map.set(Number(f.idFormation), String(f.titreFormation ?? '')));
    return (id: number) => map.get(id) ?? `Formation ${id}`;
  }, [formations]);

  const { message } = useAppNotification();
  const [exporting, setExporting] = useState(false);

  /** Export Excel des réponses (anonymes), filtré comme la page. */
  const exporter = async () => {
    setExporting(true);
    try {
      const reponses = await FormationFeedbackService.getReponses(formationId);
      if (reponses.length === 0) {
        message.info('Aucune réponse à exporter.');
        return;
      }
      const suffixe = formationId ? `-${titre(formationId).replace(/[^\p{L}\p{N}]+/gu, '_')}` : '';
      await exportFeedbackExcel(
        reponses,
        titre,
        `evaluations-formations${suffixe}-${dayjs().format('YYYY-MM-DD')}`,
      );
    } catch {
      message.error('Export Excel impossible : réessayez plus tard.');
    } finally {
      setExporting(false);
    }
  };

  const total = stats?.totalReponses ?? 0;
  const vide = !isLoading && total === 0;

  const moyenneGenerale = useMemo(() => {
    if (!stats) return null;
    const m = ASPECTS.map((a) => stats.aspects[a.stat]?.moyenne).filter(
      (v): v is number => v != null,
    );
    return m.length ? Math.round((m.reduce((s, v) => s + v, 0) / m.length) * 100) / 100 : null;
  }, [stats]);

  const repartitionData = useMemo(
    () => ({
      labels: ASPECTS.map((a) => a.label),
      datasets: NIVEAUX_SATISFACTION.map((niveau, i) => ({
        label: niveau,
        data: ASPECTS.map((a) => pct(stats?.aspects[a.stat]?.repartition[i] ?? 0, total)),
        backgroundColor: NIVEAU_COLORS[i],
        borderWidth: 0,
        barThickness: 34,
      })),
    }),
    [stats, total],
  );

  const repartitionOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 10 } },
        tooltip: {
          ...(cardTooltip as object),
          callbacks: { label: (ctx) => ` ${ctx.dataset.label} : ${ctx.parsed.x} %` },
        },
        datalabels: { display: false },
      },
      scales: {
        x: { stacked: true, max: 100, ticks: { callback: (v) => `${v} %` } },
        y: { stacked: true, grid: { display: false } },
      },
    }),
    [],
  );

  const formationOptions = useMemo(
    () =>
      (allStats?.parFormation ?? []).map((f) => ({
        value: f.formationId,
        label: `${titre(f.formationId)} (${f.reponses})`,
      })),
    [allStats, titre],
  );

  const parUp = Object.entries(stats?.parUp ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="evaluation-stats-page">
      <AppPageHeader
        icon={<BarChartOutlined />}
        title="Statistiques des évaluations"
        subtitle="Questionnaire de satisfaction des participants — résultats anonymes"
        actions={
          <Space wrap>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Toutes les formations"
              style={{ minWidth: 280 }}
              value={formationId}
              onChange={(v) => setFormationId(v)}
              options={formationOptions}
              aria-label="Filtrer par formation"
            />
            <Button icon={<FileExcelOutlined />} loading={exporting} onClick={exporter}>
              Exporter Excel
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Réponses envoyées" value={total} loading={isLoading} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Satisfaction moyenne"
              value={moyenneGenerale ?? '—'}
              suffix={moyenneGenerale != null ? '/ 5' : undefined}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Besoin d'une formation complémentaire"
              value={pct(stats?.besoinComplementaire.oui ?? 0, total)}
              suffix="%"
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Formations évaluées"
              value={stats?.parFormation.length ?? 0}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <ChartCard
            title={formationId ? titre(formationId) : 'Toutes les formations'}
            subtitle="Répartition des réponses par aspect"
            loading={isLoading}
            empty={vide}
            emptyMessage="Aucune réponse pour le moment."
            height={300}
            csv={{
              headers: ['Aspect', ...NIVEAUX_SATISFACTION, 'Moyenne / 5'],
              rows: ASPECTS.map((a) => [
                a.label,
                ...(stats?.aspects[a.stat]?.repartition ?? [0, 0, 0, 0, 0]),
                stats?.aspects[a.stat]?.moyenne ?? '',
              ]),
            }}
            exportFileName="evaluations-repartition"
          >
            <Bar data={repartitionData} options={repartitionOptions} />
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard
            title="Formation complémentaire"
            subtitle="Besoin d'une formation dans le même domaine"
            loading={isLoading}
            empty={vide}
            height={300}
          >
            <DonutChart
              slices={[
                { label: 'Oui', value: stats?.besoinComplementaire.oui ?? 0, color: '#2f5fb3' },
                { label: 'Non', value: stats?.besoinComplementaire.non ?? 0, color: '#9ca3af' },
              ]}
              centerLabel="réponses"
            />
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Moyenne par aspect"
            subtitle="Échelle 1 à 5"
            loading={isLoading}
            empty={vide}
          >
            <BarChart
              labels={ASPECTS.map((a) => a.label)}
              values={ASPECTS.map((a) => stats?.aspects[a.stat]?.moyenne ?? 0)}
              datasetLabel="Moyenne"
              valueSuffix=" / 5"
              max={5}
            />
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard
            title="Réponses par formation"
            loading={isLoading}
            empty={vide}
            csv={{
              headers: ['Formation', 'Réponses', 'Moyenne / 5'],
              rows: (stats?.parFormation ?? []).map((f) => [
                titre(f.formationId),
                f.reponses,
                f.moyenne ?? '',
              ]),
            }}
            exportFileName="evaluations-par-formation"
          >
            <BarChart
              labels={(stats?.parFormation ?? []).map((f) => court(titre(f.formationId)))}
              values={(stats?.parFormation ?? []).map((f) => f.reponses)}
              datasetLabel="Réponses"
              colorByValue={false}
            />
          </ChartCard>
        </Col>
        <Col xs={24} lg={8}>
          <ChartCard title="Réponses par UP" loading={isLoading} empty={vide}>
            <BarChart
              labels={parUp.map(([up]) => court(up))}
              values={parUp.map(([, n]) => n)}
              datasetLabel="Réponses"
              colorByValue={false}
            />
          </ChartCard>
        </Col>

        <Col xs={24}>
          <Card title="Remarques des participants">
            <Table
              size="small"
              rowKey={(r, i) => `${r.formationId}-${i}`}
              loading={isLoading}
              dataSource={stats?.commentaires ?? []}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              locale={{ emptyText: 'Aucune remarque.' }}
              columns={[
                {
                  title: 'Formation',
                  dataIndex: 'formationId',
                  render: (id: number) => titre(id),
                  width: 220,
                },
                {
                  title: 'Date',
                  dataIndex: 'date',
                  render: (d?: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
                  width: 110,
                },
                {
                  title: 'Autres informations',
                  dataIndex: 'autresInformations',
                  render: (t) => t ?? '—',
                },
                {
                  title: 'Besoins pour de futures sessions',
                  dataIndex: 'autresBesoins',
                  render: (t) => t ?? '—',
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
