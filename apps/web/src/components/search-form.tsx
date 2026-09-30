"use client";

import { useQueryState } from "nuqs";
import { useState } from "react";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { catalogSearchParsers } from "@/lib/search-params";
import { siteCopy } from "@/messages/fa";

export function SearchForm() {
  const [q, setQ] = useQueryState("q", catalogSearchParsers.q);
  const [draft, setDraft] = useState(q);

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const next = draft.trim().slice(0, 80);
        void setQ(next.length > 0 ? next : null);
      }}
    >
      <label className="sr-only" htmlFor="store-search">
        {siteCopy.searchLabel}
      </label>
      <Input
        id="store-search"
        name="q"
        onChange={(event) => setDraft(event.target.value)}
        placeholder={siteCopy.searchPlaceholder}
        value={draft}
      />
      <Button type="submit">{siteCopy.searchSubmit}</Button>
    </form>
  );
}
