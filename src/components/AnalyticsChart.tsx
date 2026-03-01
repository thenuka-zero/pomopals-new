"use client";

import { PeriodAnalytics, AnalyticsPeriod } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";

interface AnalyticsChartProps {
  data: PeriodAnalytics[];
  period: AnalyticsPeriod;
}

function formatXLabel(d: PeriodAnalytics): string {
  switch (d.period) {
    case "day":
      return format(parseISO(d.periodStart), "EEE d");
    case "week":
      return `Wk ${format(parseISO(d.periodStart), "MMM d")}`;
    case "month":
      return format(parseISO(d.periodStart), "MMM yyyy");
    default:
      return d.periodStart;
  }
}

function formatTooltipLabel(d: PeriodAnalytics): string {
  switch (d.period) {
    case "day":
      return format(parseISO(d.periodStart), "EEEE, MMM d");
    case "week":
      return `Week of ${format(parseISO(d.periodStart), "MMM d")} - ${format(parseISO(d.periodEnd), "MMM d")}`;
    case "month":
      return format(parseISO(d.periodStart), "MMMM yyyy");
    default:
      return d.periodStart;
  }
}

interface ChartDataPoint {
  label: string;
  tooltipLabel: string;
  completed: number;
  partial: number;
  total: number;
  focusMinutes: number;
  completionRate: number;
}

export default function AnalyticsChart({ data, period }: AnalyticsChartProps) {
  const chartData: ChartDataPoint[] = data.map((d) => ({
    label: formatXLabel(d),
    tooltipLabel: formatTooltipLabel(d),
    completed: d.completedPomodoros,
    partial: d.partialPomodoros,
    total: d.totalPomodoros,
    focusMinutes: d.totalFocusMinutes,
    completionRate: d.completionRate,
  }));

  const hasData = data.some((d) => d.totalPomodoros > 0);

  const periodLabel =
    period === "day" ? "Daily" : period === "week" ? "Weekly" : "Monthly";

  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm text-[#8B7355] font-semibold mb-4">
        {periodLabel} Pomodoros
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E54B4B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#E54B4B" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradPartial" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F5A0A0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F5A0A0" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F0E6D3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#A08060"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#A08060"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#E54B4B", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stackId="pomodoros"
              stroke="#E54B4B"
              strokeWidth={2.5}
              fill="url(#gradCompleted)"
              dot={{ r: 3, fill: "#E54B4B", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#E54B4B", stroke: "#fff", strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="partial"
              stackId="pomodoros"
              stroke="#F5A0A0"
              strokeWidth={1.5}
              fill="url(#gradPartial)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex flex-col items-center justify-center text-[#A08060] gap-2">
          <svg
            width="48"
            height="48"
            viewBox="0 0 200 200"
            fill="none"
            className="opacity-30"
          >
            <ellipse cx="100" cy="115" rx="72" ry="68" fill="#E54B4B" />
            <ellipse
              cx="82"
              cy="52"
              rx="18"
              ry="8"
              fill="#6EAE3E"
              transform="rotate(-25 82 52)"
            />
            <ellipse
              cx="118"
              cy="52"
              rx="18"
              ry="8"
              fill="#6EAE3E"
              transform="rotate(25 118 52)"
            />
            <rect x="95" y="42" width="10" height="18" rx="5" fill="#5B8C3E" />
          </svg>
          <p className="text-sm font-medium">
            No data yet. Complete some Pomodoros to see your stats!
          </p>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload as ChartDataPoint | undefined;
  if (!data) return null;

  return (
    <div className="bg-white border-2 border-[#F0E6D3] rounded-xl p-3 shadow-lg min-w-[180px]">
      <p className="text-xs font-bold text-[#5C4033] mb-2">
        {data.tooltipLabel}
      </p>
      <div className="space-y-1">
        <TooltipRow color="#E54B4B" label="Completed" value={data.completed} />
        <TooltipRow color="#F5A0A0" label="Partial" value={data.partial} />
        <TooltipRow
          color="#A08060"
          label="Focus"
          value={`${Math.round(data.focusMinutes)}m`}
        />
        <TooltipRow
          color="#6EAE3E"
          label="Rate"
          value={`${data.completionRate}%`}
        />
      </div>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[#8B7355]">{label}</span>
      </div>
      <span className="font-bold text-[#3D2C2C]">{value}</span>
    </div>
  );
}
