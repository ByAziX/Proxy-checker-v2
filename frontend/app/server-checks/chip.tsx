import { cn } from "@/lib/utils";

type ChipProps = {
  label: string;
  value: number;
  suffix?: string;
  tone?: "green" | "rose" | "blue" | "primary";
};

export function Chip({ label, value, suffix, tone }: ChipProps) {
  const color =
    tone === "green"
      ? "text-emerald-600"
      : tone === "rose"
        ? "text-rose-600"
        : tone === "blue"
          ? "text-sky-600"
          : "text-primary";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800",
        color
      )}
    >
      {label}: {value}
      {suffix ? suffix : null}
    </span>
  );
}
