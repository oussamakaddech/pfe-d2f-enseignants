// src/components/GradientLineChart.js
import  { useRef, useEffect, useState } from 'react';
import { Card, Spin } from 'antd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GradientLineChart = ({ title, labels, values }) => {
  const chartRef = useRef(null);
  const [data, setData] = useState({
    labels,
    datasets: [{
      label: title,
      data: values,
      fill: true,
      tension: 0.4,
      borderColor: 'rgba(255,0,0,1)',
      borderWidth: 3,
      pointRadius: 6,
      pointBackgroundColor: 'rgba(255,0,0,1)',
      pointBorderColor: '#fff',
      pointHoverRadius: 8
    }]
  });

  const options = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: title,
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleFont: { size: 14 },
        bodyFont: { size: 13 },
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.1)',
          borderDash: [4,4]
        },
        ticks: { stepSize: 70 }
      }
    }
  };

  // Applique le dégradé après le premier rendu
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const ctx = chart.ctx;
    const { top, bottom } = chart.chartArea;
    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, 'rgba(255,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(255,0,0,0.05)');
    chart.data.datasets[0].backgroundColor = gradient;
    chart.update();
  }, [labels, values]);

  return (
    <Card style={{ width: '100%', maxWidth: 700, margin: 'auto' }}>
      {values.length === 0
        ? <Spin tip="Chargement…" style={{ display:'block', padding:40 }} />
        : <Line ref={chartRef} data={data} options={options} />
      }
    </Card>
  );
};

export default GradientLineChart;
