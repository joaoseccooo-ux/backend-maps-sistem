import { STATUS_META, type LeadStatus } from "@/lib/lead-status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badge,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
