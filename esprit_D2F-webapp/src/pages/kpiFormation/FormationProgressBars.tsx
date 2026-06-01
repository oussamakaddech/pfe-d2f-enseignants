import { useState } from "react";
import {
  Card,
  Progress,
  Typography,
  Row,
  Col,
  DatePicker,
  Space,
  Spin,
  Input,
  Select,
  Switch
} from "antd";
import dayjs from "dayjs";
import { useAllFormations, useUps, useDepartements } from "@/hooks/formation";
import { useFormationsParticipantKPIs } from "@/hooks/kpi";
import "@/styles/components/chart-scroll.css";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search }      = Input;
const { Option }      = Select;

export default function FormationProgressCards() {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf("year"),
    dayjs().endOf("year"),
  ]);
  const [searchTitle, setSearchTitle]   = useState("");
  const [searchDomaine, setSearchDomaine] = useState("");
  const [selectedUp, setSelectedUp]     = useState(undefined);
  const [selectedDept, setSelectedDept] = useState(undefined);
  const [sortAsc, setSortAsc]           = useState(false);

  const { data: formsRaw = [] } = useAllFormations();
  const { data: upsRaw = [] }   = useUps();
  const { data: deptsRaw = [] } = useDepartements();

  type FormRow = { idFormation?: unknown; titreFormation?: string; domaine?: string; up1?: { id?: unknown }; departement1?: { id?: unknown } };
  type OptionRow = { id?: unknown; libelle?: string };
  type KpiRow = { formationId?: unknown; nombreParticipantsTotal?: number; nombreParticipantsPresent?: number; tauxParticipation?: number };

  const forms  = formsRaw as FormRow[];
  const ups    = upsRaw   as OptionRow[];
  const depts  = deptsRaw as OptionRow[];

  const startDate = range[0].format("YYYY-MM-DD");
  const endDate   = range[1].format("YYYY-MM-DD");
  const { data: kpisRaw, isLoading: loading } = useFormationsParticipantKPIs(startDate, endDate);
  const kpis = Array.isArray(kpisRaw) ? (kpisRaw as KpiRow[]) : [];

  if (loading) {
    return (
      <div style={styles.center}>
        <Spin size="large" />
      </div>
    );
  }

  // Filtrer les formations
  const filtered = forms
    .filter(f =>
      !searchTitle ||
      (f.titreFormation ?? "").toLowerCase().includes(searchTitle.toLowerCase())
    )
    .filter(f =>
      !searchDomaine ||
      f.domaine?.toLowerCase().includes(searchDomaine.toLowerCase())
    )
    .filter(f =>
      !selectedUp ||
      f.up1?.id === selectedUp
    )
    .filter(f =>
      !selectedDept ||
      f.departement1?.id === selectedDept
    );

  // 5) Fusionner avec KPI
  const merged = filtered.map(f => {
    const k: KpiRow = kpis.find(k => k.formationId === f.idFormation) ?? {
      nombreParticipantsTotal:   0,
      nombreParticipantsPresent: 0,
      tauxParticipation:         0,
    };
    return { ...f, ...k };
  });

  // 6) Tri
  const sorted = merged.sort((a, b) =>
    sortAsc
      ? (a.tauxParticipation ?? 0) - (b.tauxParticipation ?? 0)
      : (b.tauxParticipation ?? 0) - (a.tauxParticipation ?? 0)
  );

  // 7) Affichage
  return (
    <div style={styles.wrapper}>
      <h4 style={styles.header}>
        👨🏻‍🏫 Taux de Participation par Formation
      </h4>

      {/* — filtres — */}
      <Space wrap style={styles.filterBar}>
        <RangePicker
          value={range}
          format="YYYY-MM-DD"
          onChange={dates => dates && setRange([dates[0] as dayjs.Dayjs, dates[1] as dayjs.Dayjs])}
        />
        <Search
          placeholder="Recherche titre..."
          value={searchTitle}
          onChange={e => setSearchTitle(e.target.value)}
          allowClear
          style={{ width: 200 }}
        />
        <Search
          placeholder="Recherche domaine..."
          value={searchDomaine}
          onChange={e => setSearchDomaine(e.target.value)}
          allowClear
          style={{ width: 160 }}
        />
        <Select
          placeholder="UP"
          allowClear
          value={selectedUp}
          onChange={setSelectedUp}
          style={{ width: 120 }}
        >
          {ups.map(u => <Option key={String(u.id)} value={u.id as string}>{u.libelle}</Option>)}
        </Select>
        <Select
          placeholder="Dépt"
          allowClear
          value={selectedDept}
          onChange={setSelectedDept}
          style={{ width: 140 }}
        >
          {depts.map(d => <Option key={String(d.id)} value={d.id as string}>{d.libelle}</Option>)}
        </Select>
        <span>
          Tri asc&nbsp;
          <Switch checked={sortAsc} onChange={setSortAsc} />
        </span>
      </Space>

      {/* — KPI cards (scrollable 400px) — */}
      <div style={styles.cardsContainer}>
        <Row gutter={[16, 16]}>
          {sorted.map(f => {
            const pct = Math.round(f.tauxParticipation ?? 0);
            return (
              <Col span={24} key={String(f.idFormation)}>
                <Card hoverable style={styles.card} styles={{ body: { padding: 16 } }}>
                  <Text strong style={styles.title}>
                    {f.titreFormation}
                  </Text>
                  <Progress
                    percent={pct}
                    size="small"
                    strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
                    showInfo={false}
                    style={{ margin: "12px 0" }}
                  />
                  <div style={styles.footer}>
                    <Text type="secondary">
                      {f.nombreParticipantsPresent} / {f.nombreParticipantsTotal}
                    </Text>
                    <Text strong style={styles.percent}>
                      {pct}%
                    </Text>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper:        { maxWidth: 900, margin: "auto", padding: 20, fontFamily: "'Arial', sans-serif'" },
  header:         { textAlign: "left", marginBottom: 20 },
  filterBar:      { marginBottom: 16 },
  cardsContainer: { maxHeight: 250, overflowY: "auto", paddingRight: 8 },
  card:           { borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  title:          { fontSize: 16, display: "block", marginBottom: 8 },
  footer:         { display: "flex", justifyContent: "space-between", alignItems: "center" },
  percent:        { color: "#24292e", fontSize: 14 },
  center:         { display: "flex", justifyContent: "center", padding: 50 }
};




