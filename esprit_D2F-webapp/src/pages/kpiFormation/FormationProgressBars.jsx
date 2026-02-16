// src/components/FormationProgressCards.jsx
import  { useState, useEffect } from "react";
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
import FormationWorkflowService from "../../services/FormationWorkflowService";
import ParticipantKPIService    from "../../services/ParticipantKPIService";
import UpService                from "../../services/upService";
import DeptService              from "../../services/DeptService";
import CompetenceService        from "../../services/CompetenceService";
import "../../Style/ChartScroll.css";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Search }      = Input;
const { Option }      = Select;

export default function FormationProgressCards() {
  // États
  const [forms, setForms]       = useState([]);  
  const [kpis, setKpis]         = useState([]);  
  const [loading, setLoading]   = useState(true);

  // Plage de dates
  const [range, setRange]       = useState([
    dayjs().startOf("year"),
    dayjs().endOf("year")
  ]);

  // Options selects
  const [ups, setUps]           = useState([]);
  const [depts, setDepts]       = useState([]);
  const [comps, setComps]       = useState([]);
  const [, setDomaines] = useState([]);

  // Filtres UI
  const [searchTitle, setSearchTitle]           = useState("");
  const [searchDomaine, setSearchDomaine]       = useState("");
  const [selectedUp, setSelectedUp]             = useState(undefined);
  const [selectedDept, setSelectedDept]         = useState(undefined);
  const [selectedCompetence, setSelectedCompetence] = useState(undefined);
  const [sortAsc, setSortAsc]                   = useState(false);

  // 1) Charger UP, Dept, Compétences
  useEffect(() => {
    UpService.getAllUps().then(setUps).catch(console.error);
    DeptService.getAllDepts().then(setDepts).catch(console.error);
    CompetenceService.getAllCompetences().then(setComps).catch(console.error);
  }, []);

  // 2) Charger toutes les formations et extraire domaines
  useEffect(() => {
    FormationWorkflowService.getAllFormationWorkflows()
      .then(forms => {
        setForms(forms);
        const uniq = Array.from(
          new Set(forms.map(f => f.domaine).filter(d => d?.trim()))
        );
        setDomaines(uniq);
      })
      .catch(console.error);
  }, []);

  // 3) Charger KPI lorsque la plage change
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [start, end] = range;
        const data = await ParticipantKPIService.getFormationsParticipantKPIs(
          start.format("YYYY-MM-DD"),
          end.format("YYYY-MM-DD")
        );
        if (alive) setKpis(data);
      } catch (e) {
        console.error(e);
        if (alive) setKpis([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  if (loading) {
    return (
      <div style={styles.center}>
        <Spin size="large" tip="Chargement..." />
      </div>
    );
  }

  // 4) Filtrer les formations
  const filtered = forms
    .filter(f =>
      !searchTitle ||
      f.titreFormation.toLowerCase().includes(searchTitle.toLowerCase())
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
    )
    .filter(f =>
      !selectedCompetence ||
      f.competance?.id === selectedCompetence
    );

  // 5) Fusionner avec KPI
  const merged = filtered.map(f => {
    const k = kpis.find(k => k.formationId === f.idFormation) || {
      nombreParticipantsTotal:   0,
      nombreParticipantsPresent: 0,
      tauxParticipation:         0
    };
    return { ...f, ...k };
  });

  // 6) Tri
  const sorted = merged.sort((a, b) =>
    sortAsc
      ? a.tauxParticipation - b.tauxParticipation
      : b.tauxParticipation - a.tauxParticipation
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
          onChange={dates => dates && setRange(dates)}
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
          {ups.map(u => <Option key={u.id} value={u.id}>{u.libelle}</Option>)}
        </Select>
        <Select
          placeholder="Dépt"
          allowClear
          value={selectedDept}
          onChange={setSelectedDept}
          style={{ width: 140 }}
        >
          {depts.map(d => <Option key={d.id} value={d.id}>{d.libelle}</Option>)}
        </Select>
        <Select
          placeholder="Compétence"
          allowClear
          value={selectedCompetence}               // ← valeur contrôlée
          onChange={setSelectedCompetence}         // ← met à jour correctement
          style={{ width: 160 }}
        >
          {comps.map(c =>
            <Option key={c.id} value={c.id}>{c.nomCompetence}</Option>
          )}
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
            const pct = Math.round(f.tauxParticipation);
            return (
              <Col span={24} key={f.idFormation}>
                <Card hoverable style={styles.card} bodyStyle={{ padding: 16 }}>
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

const styles = {
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
