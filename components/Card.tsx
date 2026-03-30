"use client";

import * as React from "react";
import { cn } from "./utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

