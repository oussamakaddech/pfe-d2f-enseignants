import { useState, useMemo } from 'react';
import { DatePicker, Spin, Select, Empty } from 'antd';
import { ApartmentOutlined, ClusterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEnseignantsNonAffectes } from "@/hooks/kpi/useKpi";
import { useDepartements, useUps } from "@/hooks/formation/useFormations";
import "@/styles/pages/dashboard-page.css";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface LookupItem { id?: string | number; libelle?: string; }
interface EnseignantNonAffecte {
  nom?: string; prenom?: string; mail?: string;
  deptLibelle?: string; upLibelle?: string;
  upId?: string | number; deptId?: string | number;
}

function initials(nom?: string, prenom?: string) {
  return `${(nom ?? '').charAt(0)}${(prenom ?? '').charAt(0)}`.toUpperCase() || '?';
}

export default function NonAffectedGrid() {
  const { data: upsData }   = useUps();
  const { data: deptsData } = useDepartements();
  const ups   = (upsData   ?? []) as LookupItem[];
  const depts = (deptsData ?? []) as LookupItem[];

  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs().endOf('year'),
  ]);
  const [selectedUp,   setSelectedUp]   = useState<string | number | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | number | null>(null);

  const [start, end] = range;
  const { data: allStats, isLoading } = useEnseignantsNonAffectes(
    start.format('YYYY-MM-DD'),
    end.format('YYYY-MM-DD')
  );

  const stats = useMemo(() => {
    const source = Array.isArray(allStats) ? (allStats as EnseignantNonAffecte[]) : [];
    return source.filter((item) =>
      (!selectedUp   || item.upId   === selectedUp) &&
      (!selectedDept || item.deptId === selectedDept)
    );
  }, [allStats, selectedUp, selectedDept]);

  const plural = stats.length > 1 ? 's' : '';
  const countLabel = isLoading ? '…' : `${stats.length} enseignant${plural}`;

  return (
    <div>
      {/* ── Filtres ── */}
      <div className="dash-kpi-filter-bar">
        <RangePicker
          value={range}
          format="DD/MM/YYYY"
          style={{ maxWidth: 230 }}
          onChange={(r) => { if (r?.[0] && r?.[1]) setRange([r[0], r[1]]); }}
        />
        <Select
          allowClear placeholder="Filtrer par UP"
          value={selectedUp} onChange={(v) => setSelectedUp(v ?? null)}
          style={{ width: 140 }}
        >
          {ups.map((u) => <Option key={String(u.id)} value={u.id}>{u.libelle}</Option>)}
        </Select>
        <Select
          allowClear placeholder="Département"
          value={selectedDept} onChange={(v) => setSelectedDept(v ?? null)}
          style={{ width: 150 }}
        >
          {depts.map((d) => <Option key={String(d.id)} value={d.id}>{d.libelle}</Option>)}
        </Select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--neutral-500)' }}>
          {countLabel}
        </span>
      </div>

      {/* ── Liste ── */}
      <div className="dash-kpi-body">
        {(() => {
          if (isLoading) return <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin /></div>;
          if (stats.length === 0) return <Empty description="Aucun enseignant non affecté sur la période" style={{ padding: '40px 0' }} />;
          return (
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            {stats.map((item, idx) => (
              <div key={`${item.mail ?? ''}-${idx}`} className="dash-kpi-person-row">
                <div className="dash-kpi-person-avatar">
                  {initials(item.nom, item.prenom)}
                </div>
                <div className="dash-kpi-person-main">
                  <div className="dash-kpi-person-name">{item.nom} {item.prenom}</div>
                  <div className="dash-kpi-person-meta">
                    {item.mail && <span style={{ marginRight: 10 }}>{item.mail}</span>}
                    {item.deptLibelle && (
                      <span style={{ marginRight: 8 }}>
                        <ApartmentOutlined style={{ marginRight: 3, color: '#f59e0b' }} />
                        {item.deptLibelle}
                      </span>
                    )}
                    {item.upLibelle && (
                      <span>
                        <ClusterOutlined style={{ marginRight: 3, color: '#7c3aed' }} />
                        {item.upLibelle}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className="dash-kpi-person-badge"
                  style={{ background: '#fef3c7', color: '#92400e' }}
                >
                  Non affecté
                </span>
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
