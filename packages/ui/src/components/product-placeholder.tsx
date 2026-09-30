import { Skeleton } from "@ecom/ui/components/skeleton";
import { cn } from "cn";

type ProductPlaceholderProps = {
  className?: string;
};

export function ProductPlaceholder({ className }: ProductPlaceholderProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card p-3 shadow-sm ring-1 ring-foreground/10",
        className,
      )}
    >
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-5 w-2/5" />
    </article>
  );
}
