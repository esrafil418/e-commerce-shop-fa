import Link from "next/link";
import { Badge } from "@ecom/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@ecom/ui/components/breadcrumb";
import { Button } from "@ecom/ui/components/button";
import { EmptyState } from "@ecom/ui/components/empty-state";
import { ProductPlaceholder } from "@ecom/ui/components/product-placeholder";
import { siteCopy } from "@/messages/fa";

export function HomeContent({ query }: { query: string }) {
  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{siteCopy.home}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="flex flex-col items-start gap-4">
        <Badge variant="secondary">{siteCopy.foundationBadge}</Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {siteCopy.heroTitle}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          {siteCopy.description}
        </p>
      </section>

      {query.length > 0 ? (
        <EmptyState
          action={
            <Button nativeButton={false} render={<Link href="/" />}>{siteCopy.clearSearch}</Button>
          }
          description={siteCopy.catalogPendingBody}
          title={`${siteCopy.catalogPendingTitle}: ${query}`}
        />
      ) : (
        <section aria-label={siteCopy.placeholderSection} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">{siteCopy.placeholderSection}</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <ProductPlaceholder key={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
