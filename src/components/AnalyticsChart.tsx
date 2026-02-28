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
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">Daily Pomodoros</h3>
        {data.some((d) => d.totalPomodoros > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={2}>
              <XAxis dataKey="date" stroke="#A08060" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#A08060" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#FFF", border: "2px solid #F0E6D3", borderRadius: "12px" }}
                labelStyle={{ color: "#5C4033" }}
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
                  <Cell key={index} fill="#E54B4B" />
                ))}
              </Bar>
              <Bar dataKey="partial" stackId="pomodoros" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill="#F5A0A0" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[#A08060]">
            No data yet. Complete some Pomodoros to see your stats!
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5">
        <h3 className="text-sm text-[#8B7355] font-semibold mb-4">Recent Sessions</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.flatMap((d) => d.sessions).length === 0 ? (
            <p className="text-[#A08060] text-sm">No sessions recorded yet.</p>
          ) : (
            data
              .flatMap((d) => d.sessions)
              .reverse()
              .slice(0, 20)
              .map((session) => (
                <div key={session.id} className="flex items-center justify-between py-3 px-4 bg-[#FDF6EC] border border-[#F0E6D3] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        session.completed ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"
                      }`}
                    />
                    <div>
                      <span className="text-sm text-[#3D2C2C] font-semibold">
                        {Math.round(session.actualDuration / 60)}m / {Math.round(session.plannedDuration / 60)}m
                      </span>
                      <span className="text-xs text-[#A08060] ml-2">
                        {format(parseISO(session.startedAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2.5 bg-[#F0E6D3] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${session.completed ? "bg-[#6EAE3E]" : "bg-[#E54B4B]"}`}
                        style={{ width: `${session.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#8B7355] w-10 text-right font-semibold">{session.completionPercentage}%</span>
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
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-4 text-center">
      <div className="text-2xl font-extrabold text-[#E54B4B]">{value}</div>
      <div className="text-xs text-[#8B7355] mt-1 font-semibold">{label}</div>
    </div>
  );
}
