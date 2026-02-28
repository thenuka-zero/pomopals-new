"use client";

import { DailyAnalytics } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";

interface AnalyticsChartProps {
  data: DailyAnalytics[];
}

export default function AnalyticsChart({ data }: AnalyticsChartProps) {
  const chartData = data.map((d) => ({
    date: format(parseISO(d.date), "EEE"),
    fullDate: format(parseISO(d.date), "MMM d"),
    completed: d.completedPomodoros,
    partial: d.partialPomodoros,
    totalMinutes: d.totalFocusMinutes,
    completionRate: d.completionRate,
  }));

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Pomodoros"
          value={data.reduce((s, d) => s + d.totalPomodoros, 0).toString()}
        />
        <StatCard
          label="Completed"
          value={data.reduce((s, d) => s + d.completedPomodoros, 0).toString()}
        />
        <StatCard
          label="Focus Time"
          value={`${Math.round(data.reduce((s, d) => s + d.totalFocusMinutes, 0))}m`}
        />
        <StatCard
          label="Avg Completion"
          value={`${data.length > 0 ? Math.round(data.reduce((s, d) => s + d.completionRate, 0) / data.filter(d => d.totalPomodoros > 0).length || 0) : 0}%`}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm text-gray-400 mb-4">Daily Pomodoros</h3>
        {data.some((d) => d.totalPomodoros > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value, name) => {
                  const label = name === "completed" ? "Completed" : "Partial";
                  return [value ?? 0, label];
                }}
                labelFormatter={(label, payload) => {
                  const first = payload?.[0]?.payload as { fullDate?: string } | undefined;
                  return first?.fullDate || String(label);
                }}
              />
              <Bar dataKey="completed" stackId="pomodoros" radius={[0, 0, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill="#ef4444" />
                ))}
              </Bar>
              <Bar dataKey="partial" stackId="pomodoros" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill="#ef444466" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-500">
            No data yet. Complete some Pomodoros to see your stats!
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm text-gray-400 mb-4">Recent Sessions</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.flatMap((d) => d.sessions).length === 0 ? (
            <p className="text-gray-500 text-sm">No sessions recorded yet.</p>
          ) : (
            data
              .flatMap((d) => d.sessions)
              .reverse()
              .slice(0, 20)
              .map((session) => (
                <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        session.completed ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <div>
                      <span className="text-sm text-white">
                        {Math.round(session.actualDuration / 60)}m / {Math.round(session.plannedDuration / 60)}m
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {format(parseISO(session.startedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${session.completed ? "bg-green-500" : "bg-yellow-500"}`}
                        style={{ width: `${session.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{session.completionPercentage}%</span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
