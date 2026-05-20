import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  RadialLinearScale, PointElement, LineElement, Filler,
  PolarAreaController, RadarController,
  Tooltip, Legend, Title,
} from "chart.js";

ChartJS.register(
  ArcElement, BarElement, CategoryScale, LinearScale,
  RadialLinearScale, PointElement, LineElement, Filler,
  PolarAreaController, RadarController,
  Tooltip, Legend, Title,
);

export default ChartJS;




