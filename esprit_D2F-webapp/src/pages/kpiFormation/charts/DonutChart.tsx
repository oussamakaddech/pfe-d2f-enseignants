import { Card } from "antd";
import { Doughnut } from "react-chartjs-2";

interface DonutChartEntry {
  name: string;
  value: number;
}

interface DonutChartProps {
  data: DonutChartEntry[];
  colors: string[];
  total: number;
  onClick?: () => void;
}

export default function DonutChart({ data, colors, total, onClick }: Readonly<DonutChartProps>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      styles={{ body: { padding: 16 } }}
    >
      <div
        role="button"
        tabIndex={0}
        style={{ cursor: "pointer" }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <Doughnut
          data={{
            labels: data.map((d) => d.name),
            datasets: [
              {
                data: data.map((d) => d.value),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "#fff",
              },
            ],
          }}
          options={{
            cutout: "60%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  padding: 16,
                  font: { size: 12 },
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const val = ctx.parsed;
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
                    return `${ctx.label}: ${val} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </Card>
  );
}

import React from "react";
