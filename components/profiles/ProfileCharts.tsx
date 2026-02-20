'use client';

import { useMemo } from 'react';
import type { OverallScoreHistoryEntry, PointsHistoryEntry } from '@/lib/db/queries';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

interface ProfileChartsProps {
  overallHistory: OverallScoreHistoryEntry[];
  pointsHistory: PointsHistoryEntry[];
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PAD_LEFT = 40;
const PAD_RIGHT = 20;
const PAD_TOP = 10;
const PAD_BOTTOM = 35;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

function SvgLineChart({
  title,
  data,
  stroke,
  yMin = 0,
  yMax,
}: {
  title: string;
  data: { date: string; value: number }[];
  stroke: string;
  yMin?: number;
  yMax?: number;
}) {
  const chartData = useMemo(() => {
    if (data.length < 2)
      return null;

    const values = data.map((d) => d.value);
    const vMin = yMin ?? Math.min(...values);
    const vMax = yMax ?? Math.max(...values);
    const range = vMax - vMin || 1;

    const points = data.map((d, i) => {
      const x = PAD_LEFT + (i / Math.max(1, data.length - 1)) * PLOT_WIDTH;
      const y = PAD_TOP + PLOT_HEIGHT - ((d.value - vMin) / range) * PLOT_HEIGHT;
      return `${x},${y}`;
    });
    const path = `M ${points.join(' L ')}`;

    const yTickCount = 5;
    const yTicks: number[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      yTicks.push(vMin + (range * i) / yTickCount);
    }

    const step = Math.max(1, Math.floor(data.length / 5));
    const xTicks = data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => {
        const idx = data.findIndex((x) => x.date === d.date);
        return { i: idx, label: formatDate(d.date) };
      });

    return { path, yTicks, xTicks, vMin, vMax, range };
  }, [data, yMin, yMax]);

  if (!chartData) return null;
  const { path, yTicks, xTicks, vMin, range } = chartData;

  return (
    <div className="rounded-lg bg-primary-50 dark:bg-[#0c1451]/20 p-4">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{title}</p>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-64"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        {yTicks.slice(1, -1).map((v, i) => {
          const y = PAD_TOP + PLOT_HEIGHT - ((v - vMin) / range) * PLOT_HEIGHT;
          return (
            <line
              key={i}
              x1={PAD_LEFT}
              y1={y}
              x2={CHART_WIDTH - PAD_RIGHT}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeDasharray="3 3"
            />
          );
        })}
        {/* Y axis labels */}
        {yTicks.map((v, i) => {
          const y = PAD_TOP + PLOT_HEIGHT - ((v - vMin) / range) * PLOT_HEIGHT;
          return (
            <text
              key={i}
              x={PAD_LEFT - 6}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              className="text-slate-600 dark:text-slate-400"
            >
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          );
        })}
        {/* X axis labels */}
        {xTicks.map(({ i: idx, label }) => {
          const x = PAD_LEFT + (idx / Math.max(1, data.length - 1)) * PLOT_WIDTH;
          return (
            <text
              key={idx}
              x={x}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              className="text-slate-600 dark:text-slate-400"
            >
              {label}
            </text>
          );
        })}
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {data.map((d, i) => {
          const x = PAD_LEFT + (i / Math.max(1, data.length - 1)) * PLOT_WIDTH;
          const y = PAD_TOP + PLOT_HEIGHT - ((d.value - vMin) / range) * PLOT_HEIGHT;
          return <circle key={i} cx={x} cy={y} r={4} fill={stroke} />;
        })}
      </svg>
    </div>
  );
}

export function ProfileCharts({ overallHistory, pointsHistory }: ProfileChartsProps) {
  const hasOverall = overallHistory.length > 0;
  const hasPoints = pointsHistory.length > 0;
  if (!hasOverall && !hasPoints) return null;

  const overallData = overallHistory.map((e) => ({ date: e.date, value: e.overall_score }));
  const pointsData = pointsHistory.map((e) => ({ date: e.date, value: e.cumulative_points }));

  return (
    <div className="mt-6 pt-6 border-t border-primary-100 dark:border-primary-300/50 space-y-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
        Andamento nel tempo
      </h3>

      {hasOverall && (
        <SvgLineChart
          title="Punteggio overall"
          data={overallData}
          stroke="var(--accent-500, #B2FF00)"
          yMin={0}
          yMax={100}
        />
      )}

      {hasPoints && (
        <SvgLineChart
          title="Punti ATP cumulativi"
          data={pointsData}
          stroke="var(--primary-300, #6270F3)"
          yMin={0}
        />
      )}
    </div>
  );
}
