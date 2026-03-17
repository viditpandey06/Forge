import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export function ThroughputChart({ series = [] }) {
  const dataPoints = series.map((point) => ({
    time: new Date(point.ts).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    val: point.throughput,
  }));

  const data = {
    labels: dataPoints.map(p => p.time),
    datasets: [
      {
        fill: true,
        label: 'Jobs/Sec',
        data: dataPoints.map(p => p.val),
        borderColor: 'rgb(56, 189, 248)',    // text-sky-400
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // bg-slate-900
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#64748b' }, // text-slate-500
      },
      y: {
        beginAtZero: true,
        grid: { color: '#1e293b', drawBorder: false }, // border-slate-800
        ticks: { color: '#64748b' },
      },
    },
  };

  return (
    <div className="w-full h-64">
      <Line options={options} data={data} />
    </div>
  );
}
