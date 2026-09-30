"use client";

import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import { siteCopy, storeCopy } from "@/messages/fa";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "../recent-searches";

type Hit = { label: string; href: string };

export function SearchBox({
  idPrefix,
  autoFocus = false,
  onNavigate,
}: {
  idPrefix: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const inputId = `${idPrefix}-search`;
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const term = draft.trim();
    if (term.length < 2) return;
    const handle = window.setTimeout(() => {
      void fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`)
        .then(async (response) => {
          if (!response.ok) return { hits: [] as Hit[] };
          return (await response.json()) as { hits?: Hit[] };
        })
        .then((body) => setHits(Array.isArray(body.hits) ? body.hits : []))
        .catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const options: Hit[] =
    draft.trim().length >= 2
      ? hits
      : recent.map((item) => ({
          label: item,
          href: `/search?q=${encodeURIComponent(item)}`,
        }));

  function go(href: string, term?: string) {
    if (term) {
      rememberSearch(term);
      setRecent(readRecentSearches());
    }
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const chosen = active >= 0 ? options[active] : undefined;
    if (chosen) {
      go(chosen.href, draft.trim() || undefined);
      return;
    }
    const term = draft.trim().slice(0, 80);
    if (!term) return;
    go(`/search?q=${encodeURIComponent(term)}`, term);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(options.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(-1, current - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onSubmit={onSubmit}
      role="search"
    >
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={inputId}>
          {siteCopy.searchLabel}
        </label>
        <Input
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          autoFocus={autoFocus}
          id={inputId}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setRecent(readRecentSearches());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={siteCopy.searchPlaceholder}
          role="combobox"
          value={draft}
        />
        {draft ? (
          <Button
            aria-label={siteCopy.clearSearch}
            onClick={() => {
              setDraft("");
              setHits([]);
              setActive(-1);
            }}
            size="icon"
            type="button"
            variant="outline"
          >
            <XIcon />
          </Button>
        ) : null}
        <Button type="submit">{siteCopy.searchSubmit}</Button>
      </div>
      {open ? (
        <div className="absolute z-40 mt-2 w-full rounded-lg border bg-popover p-2 text-start shadow-md">
          <p className="px-2 py-1 text-xs text-muted-foreground">
            {draft.trim().length >= 2 ? storeCopy.searchSuggestions : storeCopy.searchRecent}
          </p>
          <ul id={listId} role="listbox">
            {options.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">{storeCopy.searchNoSuggestions}</li>
            ) : (
              options.map((option, index) => (
                <li key={`${option.href}-${option.label}`}>
                  <button
                    aria-selected={index === active}
                    className="w-full rounded-md px-2 py-2 text-start text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-selected:bg-muted"
                    id={`${listId}-${index}`}
                    onClick={() => go(option.href, draft.trim() || option.label)}
                    role="option"
                    type="button"
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
          {recent.length > 0 && draft.trim().length < 2 ? (
            <Button
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
              type="button"
              variant="ghost"
            >
              {storeCopy.searchClearRecent}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
