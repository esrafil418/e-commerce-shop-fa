import { formatMoney } from "../lib/money";
import { cn } from "cn";

type PriceProps = {
  amountRial: number;
  className?: string;
};

export function Price({ amountRial, className }: PriceProps) {
  return (
    <span className={cn("font-semibold tabular-nums", className)}>
      {formatMoney(amountRial)}
    </span>
  );
}
