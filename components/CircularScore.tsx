"use client";

import { useEffect, useState } from "react";
import { cn } from "./utils";

type CircularScoreProps = {
  value: number;
  size?: number;
  className?: string;
};

export function CircularScore({ value, size = 88, className }: CircularScoreProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedValue(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} aria-label={`Similarity score ${clamped}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="fill-none stroke-indigo-500 transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-semibold text-slate-900">{clamped}%</span>
    </div>
  );
}
