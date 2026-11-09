import { AlertTriangle } from "lucide-react";

export function Callout({
  title,
  children,
  tone = "yellow",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "yellow" | "red";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <AlertTriangle
        className={`size-5 shrink-0 ${tone === "red" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}
        aria-label={`${tone === "red" ? "Red" : "Yellow"} warning triangle`}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <div className="text-xs text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The standard methodology note shown alongside coverage numbers. */
export function MethodologyNote() {
  return (
    <Callout title="Red triangle: AE / SE coverage" tone="red">
      5 or more distinct Cap1 deals and less than 10% with ASE evidence in the selected region and quarter.
      Coverage = ASE-assigned deals / all deals in that book x 100. Review gaps and submit a TMR where support is needed.
    </Callout>
  );
}

export function DistrictGoalNote() {
  return (
    <Callout title="Yellow triangle: DM / SEM district goal">
      The district is below its displayed monthly goal of 12 new activation accounts. Each account counts once;
      rolloffs do not subtract credit. SEM rows show contributions to this same district goal, not separate quotas.
      A missing monthly count is unavailable, not zero, and does not trigger a warning. Deal-quarter filters do not change this monthly check.
    </Callout>
  );
}
