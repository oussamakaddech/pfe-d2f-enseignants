import { useState, useEffect } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import ParticipantKPIService from "../../services/ParticipantKPIService";

import {
    Chart as ChartJS,
    ArcElement,
    BarElement,        // <--- à ajouter
    CategoryScale,
    LinearScale,       // <--- à ajouter
    RadialLinearScale,
    PointElement,
    LineElement,
    PolarAreaController,
    RadarController,
    Tooltip,
    Legend,
    Title
  } from "chart.js";
  
  ChartJS.register(
    ArcElement,
    BarElement,        // <--- important pour les graphiques en barres
    CategoryScale,
    LinearScale,       // <--- important pour le scale "linear"
    RadialLinearScale,
    PointElement,
    LineElement,
    PolarAreaController,
    RadarController,
    Tooltip,
    Legend,
    Title
  );
  
const ParticipantKPIChart = () => {
  const [globalKpiData, setGlobalKpiData] = useState({
    total: 0,
    presents: 0,
    taux: 0,
  });

  const [formationsKpiData, setFormationsKpiData] = useState([]);

  const [start, setStart] = useState("2025-01-01");
  const [end, setEnd] = useState("2025-12-31");

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const globalKPI = await ParticipantKPIService.getGlobalParticipantKPI(start, end);
        const formationsKPI = await ParticipantKPIService.getFormationsParticipantKPIs(start, end);

        setGlobalKpiData({
          total: globalKPI.nombreParticipantsTotal,
          presents: globalKPI.nombreParticipantsPresent,
          taux: globalKPI.tauxParticipation,
        });

        setFormationsKpiData(formationsKPI);
      } catch (error) {
        console.error("Erreur récupération KPI participants :", error);
      }
    };
    fetchKPIs();
  }, [start, end]);

  return (
    <div style={{ maxWidth: "1000px", margin: "auto", padding: "30px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        🎯 Indicateurs de Participation
      </h2>

      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "40px" }}>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "30px",
        marginBottom: "40px"
      }}>

        <div style={{
          padding: "20px",
          borderRadius: "16px",
          backgroundColor: "#fefefe",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <h3>👥 Participation Globale</h3>
          <Doughnut
            data={{
              labels: ["Présents", "Absents"],
              datasets: [{
                data: [globalKpiData.presents, globalKpiData.total - globalKpiData.presents],
                backgroundColor: ["#36A2EB", "#FF6384"],
                borderWidth: 1,
              }],
            }}
            options={{
              plugins: {
                legend: { position: "bottom" },
              },
              cutout: "60%",
              animation: { duration: 1000 },
            }}
          />
          <div style={{ marginTop: "15px", fontSize: "1.2rem" }}>
            <p>Total attendus : {globalKpiData.total}</p>
            <p>Total présents : {globalKpiData.presents}</p>
            <p style={{ fontWeight: "bold" }}>Taux : {globalKpiData.taux.toFixed(2)} %</p>
          </div>
        </div>

        <div style={{
          padding: "20px",
          borderRadius: "16px",
          backgroundColor: "#fefefe",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <h3>📊 Participation par Formation</h3>
          <Bar
            data={{
              labels: formationsKpiData.map(f => f.titreFormation),
              datasets: [{
                label: "Taux de Participation (%)",
                data: formationsKpiData.map(f => f.tauxParticipation),
                backgroundColor: "rgba(54, 162, 235, 0.6)",
                borderColor: "rgba(54, 162, 235, 1)",
                borderWidth: 1,
              }],
            }}
            options={{
              scales: { y: { beginAtZero: true, max: 100 } },
              plugins: { legend: { display: false } },
              animation: { duration: 1000 },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ParticipantKPIChart;