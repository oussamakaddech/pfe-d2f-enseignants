import { useState, useRef, useMemo } from 'react';
import { Card, Row, Col, Select, DatePicker, Spin, Table, Button } from 'antd';
import { Line } from 'react-chartjs-2';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUps, useDepartements } from "@/hooks/formation/useFormations";
import { useTopParticipants } from "@/hooks/kpi/useKpi";
import { useEnseignants } from "@/hooks/enseignant/useEnseignants";
import "@/styles/components/chart-scroll.css";
import type { Chart as ChartType } from 'chart.js';

interface RefItem { id?: string | number; libelle?: string; }
interface EnseignantRef { id?: string | number; mail?: string; dept?: { libelle?: string }; up?: { libelle?: string }; }
interface KpiEntry { enseignantId?: string | number; nom?: string; prenom?: string; totalPresences?: number; mail?: string; deptLibelle?: string; upLibelle?: string; }

const { Option }      = Select;
const { RangePicker } = DatePicker;

export default function TopParticipants() {
  const { data: upsData } = useUps();
  const { data: deptsData } = useDepartements();
  const ups = (upsData ?? []) as RefItem[];
  const depts = (deptsData ?? []) as RefItem[];
  const { data: enseignants } = useEnseignants();

  const [sortOrder, setSortOrder] = useState('desc');
  const [showTable, setShowTable] = useState(false);
  const [filters, setFilters] = useState<{
    upId: string | number | null;
    deptId: string | number | null;
    range: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  }>({
    upId: null,
    deptId: null,
    range: [ dayjs().startOf('year'), dayjs().endOf('year') ]
  });
  const chartRef = useRef<ChartType<'line'> | null>(null);

  const [start, end] = filters.range;
  const { data: raw, isLoading } = useTopParticipants(
    start ? start.format('YYYY-MM-DD') : '',
    end ? end.format('YYYY-MM-DD') : '',
    filters.upId,
    filters.deptId
  );

  const enseignantMap = useMemo(() => {
    const map = new Map<string | number, EnseignantRef>();
    (enseignants as EnseignantRef[] ?? []).forEach((ens: EnseignantRef) => { if (ens.id != null) map.set(ens.id, ens); });
    return map;
  }, [enseignants]);

  const stats = useMemo((): KpiEntry[] => {
    if (!raw) return [];
    return (raw as KpiEntry[]).map((entry: KpiEntry) => {
      const ens = entry.enseignantId == null ? undefined : enseignantMap.get(entry.enseignantId);
      return { ...entry, mail: ens?.mail, deptLibelle: ens?.dept?.libelle, upLibelle: ens?.up?.libelle };
    });
  }, [raw, enseignantMap]);

  // Tri et top 10
  const sorted = [...stats].sort((a, b) =>
    sortOrder === 'asc'
      ? (a.totalPresences ?? 0) - (b.totalPresences ?? 0)
      : (b.totalPresences ?? 0) - (a.totalPresences ?? 0)
  );
  const top10  = sorted.slice(0, 10);
  const labels = top10.map((s) => `${s.nom} ${s.prenom}`);
  const values = top10.map((s) => s.totalPresences ?? 0);

  // Chart config
  const chartData = {
    labels,
    datasets: [{
      label: 'Présences',
      data: values,
      fill: true,
      tension: 0.4,
      borderColor: 'rgba(40,167,69,1)',
      backgroundColor: 'rgba(40,167,69,0.2)',
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: 'rgba(40,167,69,1)',
      pointBorderColor: '#fff',
      pointHoverRadius: 8
    }]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Top 10 Enseignants par Présences',
        font: { size: 16 }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  // Colonnes tableau enrichi
  const columns = [
    { title: 'Nom',        dataIndex: 'nom',            key: 'nom' },
    { title: 'Prénom',     dataIndex: 'prenom',         key: 'prenom' },
    { title: 'Email',      dataIndex: 'mail',           key: 'mail' },
    { title: 'Département',dataIndex: 'deptLibelle',    key: 'deptLibelle' },
    { title: 'UP',         dataIndex: 'upLibelle',      key: 'upLibelle' },
    { title: 'Présences',  dataIndex: 'totalPresences', key: 'totalPresences' }
  ];

  return (
    <Card
      title="Top Participants"
      extra={
        <Button
          type="text"
          icon={showTable ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setShowTable(v => !v)}
        />
      }
      style={{ margin: 20, height: showTable ? 700 : 450 }}
      styles={{ body: { padding: '16px' , position: 'relative' } }}
    >
      {/* Filtres */}
      <Row gutter={16} style={{ marginBottom: 16, padding: '16px' }}>
        <Col span={6}>
          <RangePicker
            value={filters.range}
            format="YYYY-MM-DD"
            onChange={(range) => setFilters(f => ({ ...f, range: (range ?? [null, null]) as [dayjs.Dayjs | null, dayjs.Dayjs | null] }))}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={6}>
          <Select
            allowClear
            placeholder="Filtrer par UP"
            value={filters.upId}
            onChange={upId => setFilters(f => ({ ...f, upId }))}
            style={{ width: '100%' }}
          >
            {ups.map((u: RefItem) => <Option key={String(u.id)} value={u.id}>{u.libelle}</Option>)}
          </Select>
        </Col>
        <Col span={6}>
          <Select
            allowClear
            placeholder="Filtrer par Département"
            value={filters.deptId}
            onChange={deptId => setFilters(f => ({ ...f, deptId }))}
            style={{ width: '100%' }}
          >
            {depts.map((d: RefItem) => <Option key={String(d.id)} value={d.id}>{d.libelle}</Option>)}
          </Select>
        </Col>
        <Col span={6}>
          <Select
            value={sortOrder}
            onChange={val => setSortOrder(val)}
            style={{ width: '100%' }}
          >
            <Option value="desc">Descendant</Option>
            <Option value="asc">Ascendant</Option>
          </Select>
        </Col>
      </Row>

      {isLoading ? (
        <Spin tip="Chargement..." style={{ margin: '150px auto', display: 'block' }} />
      ) : (
        <>
          <div className="chartScrollWrapper" style={{ height: '60%', minHeight: 200 }}>
            <Line ref={chartRef} data={chartData} options={options} />
          </div>
          {showTable && (
            <div style={{ marginTop: 16, height: '35%', overflowY: 'auto' }}>
              <Table
                columns={columns}
                dataSource={sorted}
                rowKey="enseignantId"
                size="small"
                pagination={{ pageSize: 5 }}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}




