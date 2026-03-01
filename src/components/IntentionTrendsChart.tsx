"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DailyIntentionStat } from "@/lib/types";

interface IntentionTrendsChartProps {
  data: DailyIntentionStat[];
}

export default function IntentionTrendsChart({ data }: IntentionTrendsChartProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = data.map((d) => ({
    date: d.date,
    label: formatDate(d.date),
    completed: d.completed,
    other: d.total - d.completed,
  }));

  // Show only every ~5th label to avoid crowding
  const tickInterval = Math.floor(data.length / 6);

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#3D2C2C99" }}
            interval={tickInterval}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#3D2C2C99" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FDF6EC",
              border: "1px solid #3D2C2C20",
              borderRadius: "8px",
              fontSize: 12,
              color: "#3D2C2C",
            }}
            formatter={(value: number | undefined, name: string | undefined) => [
              value ?? 0,
              name === "completed" ? "Completed" : "Not Completed",
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar dataKey="completed" stackId="a" fill="#E54B4B" radius={[0, 0, 0, 0]}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-completed-${index}`} fill="#E54B4B" />
            ))}
          </Bar>
          <Bar dataKey="other" stackId="a" fill="#F0E6D3" radius={[3, 3, 0, 0]}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-other-${index}`} fill="#F0E6D3" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
