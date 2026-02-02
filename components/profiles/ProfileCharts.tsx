'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
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

export function ProfileCharts({ overallHistory, pointsHistory }: ProfileChartsProps) {
  const hasOverall = overallHistory.length > 0;
  const hasPoints = pointsHistory.length > 0;
  if (!hasOverall && !hasPoints) return null;

  const overallData = overallHistory.map((e) => ({
    date: e.date,
    label: formatDate(e.date),
    overall_score: e.overall_score,
  }));

  const pointsData = pointsHistory.map((e) => ({
    date: e.date,
    label: formatDate(e.date),
    cumulative_points: e.cumulative_points,
  }));

  return (
    <div className="mt-6 pt-6 border-t border-[#9AB0F8] dark:border-[#6270F3]/50 space-y-6">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
        Andamento nel tempo
      </h3>

      {hasOverall && (
        <div className="rounded-lg bg-primary-50 dark:bg-[#0c1451]/20 p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Punteggio overall
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={overallData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-600" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
                  formatter={(value: number | undefined) => [value ?? 0, 'Overall']}
                  contentStyle={{
                    backgroundColor: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="overall_score"
                  name="Overall"
                  stroke="#B2FF00"
                  strokeWidth={2}
                  dot={{ fill: '#B2FF00', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasPoints && (
        <div className="rounded-lg bg-primary-50 dark:bg-[#0c1451]/20 p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Punti ATP cumulativi
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={pointsData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-600" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
                  formatter={(value: number | undefined) => [value ?? 0, 'Punti']}
                  contentStyle={{
                    backgroundColor: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative_points"
                  name="Punti ATP"
                  stroke="#6270F3"
                  strokeWidth={2}
                  dot={{ fill: '#6270F3', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
