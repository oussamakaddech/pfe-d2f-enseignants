// src/components/KPI/KPIChart.js

import { useState, useEffect, useRef } from "react";
import { Doughnut, Radar } from "react-chartjs-2";
import { DatePicker, Divider, Statistic } from "antd";
import dayjs from "dayjs";

import KPIService from "../../services/KPIService";
import ParticipantKPIService from "../../services/ParticipantKPIService";

import FormationProgressBars from "./FormationProgressBars";
import TopParticipants from "./TopParticipants";
import TopAbsentees from "./TopAbsentees";
import NonAffectedList from "./NonAffectedList";

import MetricCards from "./MetricCards";
import FormationsByTypeFiltered from "./FormationsByTypeFiltered";
import DonutByTrainerType from "./DonutByTrainerType";
import RecommendationSection from "./RecommendationSection";

const { RangePicker } = DatePicker;

// Styles réutilisés
const cardStyle = {
  padding: "20px",
  borderRadius: 16,
  backgroundColor: "#fefefe",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  textAlign: "center"
};
const metricStyle = {
  fontSize: "1.5rem",
  fontWeight: 600,
  marginTop: 12,
  textAlign: "center"
};

export default function KPIChart() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [kpiData, setKpiData] = useState({ formations: 0, heures: 0, participants: 0 });
  const [globalKpiData, setGlobalKpiData] = useState({ total: 0, presents: 0, taux: 0 });
  const [formationsByEtat, setFormationsByEtat] = useState([]);
  const [start, setStart] = useState("2025-01-01");
  const [end, setEnd] = useState("2025-12-31");
  const fetchId = useRef(0);

  useEffect(() => {
    if (selectedTab !== "dashboard") return;

    const id = ++fetchId.current;

    const fetchKPIs = async () => {
      try {
        const [totF, totH, uniqP, byEtatData, global, formsKPI] = await Promise.all([
          KPIService.getTotalFormations(start, end),
          KPIService.getTotalHeures(start, end),
          KPIService.getUniqueParticipants(start, end),
          KPIService.getFormationsByEtat(start, end),
          ParticipantKPIService.getGlobalParticipantKPI(start, end),
          ParticipantKPIService.getFormationsParticipantKPIs(start, end),
        ]);
        if (id !== fetchId.current) return;

        setKpiData({ formations: totF, heures: totH, participants: uniqP });
        setFormationsByEtat(byEtatData);
        setGlobalKpiData({
          total: global.nombreParticipantsTotal,
          presents: global.nombreParticipantsPresent,
          taux: global.tauxParticipation,
        });
      } catch (err) {
        if (id === fetchId.current) console.error("Erreur KPI :", err);
      }
    };

    fetchKPIs();
  }, [start, end, selectedTab]);

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 30 }}>
      {/* MINI NAVBAR */}
      <nav style={{
        display: "flex", gap: 20, justifyContent: "center",
        marginBottom: 30, borderBottom: "2px solid #eee", paddingBottom: 10
      }}>
        <button
          onClick={() => setSelectedTab("dashboard")}
          style={{
            background: "none", border: "none", fontSize: 16, cursor: "pointer",
            padding: "8px 16px",
            borderBottom: selectedTab === "dashboard"
              ? "3px solid #1976d2"
              : "3px solid transparent",
            color: selectedTab === "dashboard" ? "#1976d2" : "#444",
            fontWeight: selectedTab === "dashboard" ? 600 : 500
          }}
        >📊 Dashboard</button>
        <button
          onClick={() => setSelectedTab("recommandation")}
          style={{
            background: "none", border: "none", fontSize: 16, cursor: "pointer",
            padding: "8px 16px",
            borderBottom: selectedTab === "recommandation"
              ? "3px solid #1976d2"
              : "3px solid transparent",
            color: selectedTab === "recommandation" ? "#1976d2" : "#444",
            fontWeight: selectedTab === "recommandation" ? 600 : 500
          }}
        >🤖 Recommandations</button>
      </nav>

      {selectedTab === "dashboard" ? (
        <>
          <h2 style={{ textAlign: "center", marginBottom: 30 }}>
            📈 Indicateurs de formation

          </h2>

          {/* RangePicker AntD */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
            <RangePicker
              value={[dayjs(start), dayjs(end)]}
              format="YYYY-MM-DD"
              onChange={(dates, dateStrings) => {
                if (!dates) return;
                setStart(dateStrings[0]);
                setEnd(dateStrings[1]);
              }}
              allowClear={false}
              style={{ width: 300 }}
            />
          </div>

          {/* Section : Indicateurs de formation */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 30,
            marginBottom: 40
          }}>
            {/* Participation Globale (1/3) */}
            <div style={cardStyle}>
              <h3>👥 Participation Globale</h3>
              <Doughnut
                data={{
                  labels: ["Présents", "Absents"],
                  datasets: [{
                    data: [
                      globalKpiData.presents,
                      globalKpiData.total - globalKpiData.presents
                    ],
                    backgroundColor: ["#36A2EB", "#FF6384"]
                  }]
                }}
                options={{
                  cutout: "60%",
                  plugins: { legend: { position: "bottom" } },
                  maintainAspectRatio: false
                }}
                style={{ flex: 1, maxHeight: 200 }}
              />
              <p style={metricStyle}>{globalKpiData.taux.toFixed(1)}%</p>
            </div>

            {/* Formations par état (2/3) */}
            <div style={{ ...cardStyle, height: 400 }}>
              <h3>📊 Formations par état</h3>
              <div style={{ flex: 1, position: "relative" }}>
                <Radar
                  data={{
                    labels: ["ENREGISTRÉ", "PLANIFIÉ", "EN COURS", "ACHÉVÉ", "ANNULÉ"],
                    datasets: [{
                      data: [
                        formationsByEtat.enregistre,
                        formationsByEtat.planifie,
                        formationsByEtat.enCours,
                        formationsByEtat.acheve,
                        formationsByEtat.annule
                      ],
                      backgroundColor: "rgba(153,102,255,0.2)",
                      borderColor: "rgba(153,102,255,1)"
                    }]
                  }}
                  options={{
                    scales: { r: { beginAtZero: true } },
                    plugins: { legend: { display: false } },
                    maintainAspectRatio: false
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%"
                  }}
                />
              </div>
              <p style={{ textAlign: "center", marginTop: 15 }}>
                Total formations : {formationsByEtat.total}
              </p>
            </div>
          </div>

          {/* Section : Indicateurs des formateurs */}
         
          <FormationsByTypeFiltered /><Divider/>
          <MetricCards          /><Divider/>
           <FormationProgressBars /><Divider/>
          
          <h2 style={{ textAlign: "center", marginBottom: 30 }}>📈 Indicateurs des formateurs</h2>

         <DonutByTrainerType   /><Divider/>
          <TopParticipants      /><Divider/>
          <TopAbsentees         /><Divider/>
          <NonAffectedList      />
        </>
      ) : (
        <RecommendationSection />
      )}
    </div>
  );
}
