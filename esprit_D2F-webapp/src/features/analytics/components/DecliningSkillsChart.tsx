import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { DecliningSkill } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DecliningSkillsChartProps {
  readonly skills: DecliningSkill[];
  readonly loading?: boolean;
}

/** Graphique des compétences en déclin (variation moyenne de niveau). */
export default function DecliningSkillsChart({ skills, loading }: DecliningSkillsChartProps) {
  if (loading) return <div>Chargement…</div>;
  const data = {
    labels: skills.map((s) => s.competence_nom),
    datasets: [
      {
        label: "Variation moyenne de niveau",
        data: skills.map((s) => s.variation_moyenne),
        backgroundColor: skills.map((s) =>
          s.variation_moyenne < 0 ? "#f5222d" : "#52c41a",
        ),
      },
    ],
  };
  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { title: { display: true, text: "Δ niveau (N1–N5)" } } },
      }}
    />
  );
}
