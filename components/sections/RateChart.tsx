"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { FxPoint } from "@/lib/fx";

/**
 * The Recharts area chart, split into its own module so it can be lazily
 * imported (Recharts is ~90 kB). Keeps it out of the initial bundle for the
 * homepage and converter page.
 */
export default function RateChart({
  points,
  from,
  to,
}: {
  points: FxPoint[];
  from: string;
  to: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={points} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis
          dataKey="x"
          stroke="var(--chart-axis)"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          stroke="var(--chart-axis)"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
          width={48}
          tickFormatter={(v: number) => v.toFixed(3)}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--chart-tooltip-border)",
            background: "var(--chart-tooltip-bg)",
            color: "var(--chart-tooltip-fg)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--chart-tooltip-fg)" }}
          itemStyle={{ color: "var(--chart-tooltip-fg)" }}
          formatter={(v: number) => [v.toFixed(4), `${from}/${to}`]}
        />
        <Area
          type="monotone"
          dataKey="y"
          stroke="var(--chart-line)"
          strokeWidth={2}
          fill="url(#rateGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
