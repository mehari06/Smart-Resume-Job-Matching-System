import * as React from "react";
import { cn } from "./utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
};

export function Card({ className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)]",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-22px_rgba(15,23,42,0.4)]",
        className
      )}
      {...props}
    />
  );
}
