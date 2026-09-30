import { LoadingState } from "@ecom/ui/components/loading-state";
import { siteCopy } from "@/messages/fa";

export default function StoreLoading() {
  return <LoadingState label={siteCopy.loading} />;
}
