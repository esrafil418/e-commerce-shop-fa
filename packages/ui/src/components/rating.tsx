import { StarIcon } from "lucide-react";
import { cn } from "cn";

type RatingProps = {
  value: number;
  count?: number;
  className?: string;
};

export function Rating({ value, count, className }: RatingProps) {
  const clamped = Math.min(5, Math.max(0, value));
  const label =
    count === undefined
      ? `امتیاز ${clamped} از ۵`
      : `امتیاز ${clamped} از ۵، ${count} رأی`;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex" aria-label={label} role="img">
        {Array.from({ length: 5 }, (_, index) => {
          const filled = clamped >= index + 1;
          return (
            <StarIcon
              key={index}
              aria-hidden="true"
              className={cn(
                "size-4",
                filled
                  ? "fill-foreground text-foreground"
                  : "text-muted-foreground",
              )}
            />
          );
        })}
      </span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {new Intl.NumberFormat("fa-IR").format(count)}
        </span>
      ) : null}
    </span>
  );
}
