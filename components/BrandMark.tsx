import { FileBadge2 } from "lucide-react";
import { cn } from "./utils";

type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
};

export function BrandMark({ className, iconClassName }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-indigo-700 to-cyan-600 shadow-sm ring-1 ring-black/5",
        className
      )}
      aria-hidden="true"
    >
      <FileBadge2 className={cn("h-5 w-5 text-white", iconClassName)} />
    </span>
  );
}
