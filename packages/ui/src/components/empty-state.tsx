import type { ReactNode } from "react";
import { cn } from "cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  heading?: "h1" | "h2";
};

export function EmptyState({
  title,
  description,
  action,
  className,
  heading = "h2",
}: EmptyStateProps) {
  const Title = heading;
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card px-6 py-10 text-start shadow-sm",
        className,
      )}
    >
      <Title className="text-lg font-semibold">{title}</Title>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
