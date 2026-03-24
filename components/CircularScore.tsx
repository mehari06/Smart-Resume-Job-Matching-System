"use client";

import * as React from "react";
import { cn } from "./utils";

type CircularScoreProps = {
  value: number;
  className?: string;
};

function getStrokeColor(value: number) {
  if (value >= 75) return "#16a34a";
  if (value >= 55) return "#4f46e5";
  if (value >= 40) return "#d97706";
  return "#dc2626";
}

export function CircularScore({ value, className }: CircularScoreProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;

  return (
    <div className={cn("relative h-24 w-24", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} className="fill-none stroke-slate-200" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="fill-none transition-all duration-500"
          stroke={getStrokeColor(safeValue)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-slate-900">
        {safeValue.toFixed(2)}%
      </div>
    </div>
  );
}

