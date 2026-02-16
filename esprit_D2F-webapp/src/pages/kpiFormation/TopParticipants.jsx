// src/components/TopParticipants.jsx
import { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Select, DatePicker, Spin, Table, Button } from 'antd';
import { Line } from 'react-chartjs-2';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import UpService from '../../services/upService';
import DeptService from '../../services/DeptService';
import KPIService from '../../services/KPIService';
import EnseignantService from '../../services/EnseignantService'; // ← import
import '../../Style/ChartScroll.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler
);

const { Option }      = Select;
const { RangePicker } = DatePicker;

export default function TopParticipants() {
  const [ups, setUps]             = useState([]);
  const [depts, setDepts]         = useState([]);
  const [stats, setStats]         = useState([]);       // contiendra les objets enrichis
  const [loading, setLoading]     = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [showTable, setShowTable] = useState(false);
  const [filters, setFilters]     = useState({
    upId: null,
    deptId: null,
    range: [ dayjs().startOf('year'), dayjs().endOf('year') ]
  });
  const chartRef = useRef(null);

  // Charge UPs & départements
  useEffect(() => {
    UpService.getAllUps().then(setUps).catch(console.error);
    DeptService.getAllDepts().then(setDepts).catch(console.error);
  }, []);

  // Récupère & enrichit les stats dès que les filtres changent
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [start, end] = filters.range;
        // 1) Récup KPI brut
        const raw = await KPIService.getTopParticipants(
          start.format('YYYY-MM-DD'),
          end.format('YYYY-MM-DD'),
          filters.upId,
          filters.deptId
        );
        // 2) Enrichissement via l'API Enseignant
        const enriched = await Promise.all(
          raw.map(async entry => {
            const ens = await EnseignantService.getEnseignantById(entry.enseignantId);
            return {
              ...entry,
              mail: ens.mail,
              deptLibelle: ens.dept.libelle,
              upLibelle:  ens.up.libelle
            };
          })
        );
        if (!alive) return;
        setStats(enriched);
      } catch {
        if (alive) setStats([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filters]);

  // Tri et top 10
  const sorted = [...stats].sort((a, b) =>
    sortOrder === 'asc'
      ? a.totalPresences - b.totalPresences
      : b.totalPresences - a.totalPresences
  );
  const top10  = sorted.slice(0, 10);
  const labels = top10.map(s => `${s.nom} ${s.prenom}`);
  const values = top10.map(s => s.totalPresences);

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
    interaction: { mode: 'index', intersect: false },
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
            onChange={range => setFilters(f => ({ ...f, range }))}
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
            {ups.map(u => <Option key={u.id} value={u.id}>{u.libelle}</Option>)}
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
            {depts.map(d => <Option key={d.id} value={d.id}>{d.libelle}</Option>)}
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

      {loading ? (
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
