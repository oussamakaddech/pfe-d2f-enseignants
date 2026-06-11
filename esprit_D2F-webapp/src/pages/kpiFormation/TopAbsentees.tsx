import { useState, useRef, useMemo } from 'react';
import { Select, DatePicker, Spin, Table, Button, Empty } from 'antd';
import { Line } from 'react-chartjs-2';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title as ChartTitle, Tooltip, Legend, Filler,
} from 'chart.js';
import { useTopAbsentees } from "@/hooks/kpi/useKpi";
import { useEnseignants } from "@/hooks/enseignant/useEnseignants";
import { useUps, useDepartements } from "@/hooks/formation/useFormations";
import "@/styles/components/chart-scroll.css";
import "@/styles/pages/dashboard-page.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, Filler);

interface RefItem { id?: string | number; libelle?: string; }
interface EnseignantRef { id?: string | number; mail?: string; dept?: { libelle?: string }; up?: { libelle?: string }; }
interface KpiEntry { enseignantId?: string | number; nom?: string; prenom?: string; totalPresences?: number; mail?: string; deptLibelle?: string; upLibelle?: string; }

const { RangePicker } = DatePicker;
const { Option }      = Select;

export default function TopAbsentees() {
  const { data: upsData }    = useUps();
  const { data: deptsData }  = useDepartements();
  const { data: enseignants } = useEnseignants();
  const ups   = (upsData  ?? []) as RefItem[];
  const depts = (deptsData ?? []) as RefItem[];

  const [sortOrder, setSortOrder] = useState('desc');
  const [showTable, setShowTable] = useState(false);
  const [filters, setFilters] = useState<{
    upId: string | number | null;
    deptId: string | number | null;
    range: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  }>({ upId: null, deptId: null, range: [dayjs().startOf('year'), dayjs().endOf('year')] });

  const chartRef = useRef<ChartJS<'line'> | null>(null);
  const [start, end] = filters.range;
  const { data: raw, isLoading } = useTopAbsentees(
    start ? start.format('YYYY-MM-DD') : '',
    end   ? end.format('YYYY-MM-DD')   : '',
    filters.upId,
    filters.deptId
  );

  const enseignantMap = useMemo(() => {
    const map = new Map<string | number, EnseignantRef>();
    (enseignants as EnseignantRef[] ?? []).forEach((e) => { if (e.id != null) map.set(e.id, e); });
    return map;
  }, [enseignants]);

  const stats = useMemo((): KpiEntry[] => {
    if (!raw) return [];
    return (raw as KpiEntry[]).map((entry) => {
      const ens = entry.enseignantId == null ? undefined : enseignantMap.get(entry.enseignantId);
      return { ...entry, mail: ens?.mail, deptLibelle: ens?.dept?.libelle, upLibelle: ens?.up?.libelle };
    });
  }, [raw, enseignantMap]);

  const sorted = [...stats].sort((a, b) =>
    sortOrder === 'asc'
      ? (a.totalPresences ?? 0) - (b.totalPresences ?? 0)
      : (b.totalPresences ?? 0) - (a.totalPresences ?? 0)
  );
  const top10  = sorted.slice(0, 10);
  const labels = top10.map((s) => `${s.nom ?? ''} ${s.prenom ?? ''}`.trim());
  const values = top10.map((s) => s.totalPresences ?? 0);

  const chartData = {
    labels,
    datasets: [{
      label: 'Absences',
      data: values,
      fill: true,
      tension: 0.4,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239,68,68,0.10)',
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: '#ef4444',
      pointBorderColor: '#fff',
      pointHoverRadius: 7,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 30 } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
    },
  };

  const columns = [
    { title: 'Nom',         dataIndex: 'nom',            key: 'nom' },
    { title: 'Prénom',      dataIndex: 'prenom',         key: 'prenom' },
    { title: 'Département', dataIndex: 'deptLibelle',    key: 'dept' },
    { title: 'UP',          dataIndex: 'upLibelle',      key: 'up' },
    { title: 'Absences',    dataIndex: 'totalPresences', key: 'abs', align: 'right' as const },
  ];

  return (
    <div>
      {/* ── Barre de filtres ── */}
      <div className="dash-kpi-filter-bar">
        <RangePicker
          value={filters.range}
          format="DD/MM/YYYY"
          style={{ maxWidth: 230 }}
          onChange={(r) => setFilters(f => ({ ...f, range: (r ?? [null, null]) as [dayjs.Dayjs | null, dayjs.Dayjs | null] }))}
        />
        <Select
          allowClear placeholder="Filtrer par UP"
          value={filters.upId} onChange={(v) => setFilters(f => ({ ...f, upId: v ?? null }))}
          style={{ width: 140 }}
        >
          {ups.map((u) => <Option key={String(u.id)} value={u.id}>{u.libelle}</Option>)}
        </Select>
        <Select
          allowClear placeholder="Département"
          value={filters.deptId} onChange={(v) => setFilters(f => ({ ...f, deptId: v ?? null }))}
          style={{ width: 150 }}
        >
          {depts.map((d) => <Option key={String(d.id)} value={d.id}>{d.libelle}</Option>)}
        </Select>
        <Select value={sortOrder} onChange={setSortOrder} style={{ width: 120 }}>
          <Option value="desc">↓ Desc</Option>
          <Option value="asc">↑ Asc</Option>
        </Select>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="text" size="small"
            icon={showTable ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setShowTable(v => !v)}
          >
            {showTable ? 'Masquer tableau' : 'Voir tableau'}
          </Button>
        </div>
      </div>

      {/* ── Graphique ── */}
      <div className="dash-kpi-body">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin /></div>
        ) : top10.length === 0 ? (
          <Empty description="Aucune donnée sur la période" style={{ padding: '40px 0' }} />
        ) : (
          <div className="chartScrollWrapper" style={{ height: showTable ? 200 : 280 }}>
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        )}

        {showTable && sorted.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Table
              columns={columns}
              dataSource={sorted}
              rowKey="enseignantId"
              size="small"
              pagination={{ pageSize: 5, size: 'small' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
