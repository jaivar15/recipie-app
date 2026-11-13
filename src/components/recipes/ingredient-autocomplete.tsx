"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2, Link2Off } from "lucide-react";
import { searchIngredientsAction } from "@/app/(app)/ingredients/actions";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  name: string;
  visibility: "personal" | "household";
  state: string | null;
  brand: string | null;
};

export function IngredientAutocomplete({
  value,
  linkedId,
  onChange,
}: {
  value: string;
  linkedId: string | null | undefined;
  onChange: (name: string, ingredientId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleType(text: string) {
    onChange(text, null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      const data = await searchIngredientsAction(text.trim());
      setResults(data ?? []);
      setOpen(true);
    }, 250);
  }

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return (
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger nativeButton={false} render={<div className="relative w-full" />}>
        <Input
          placeholder="Ingredient"
          value={value}
          onChange={(e) => handleType(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className={cn(linkedId && "pr-7")}
        />
        {linkedId ? (
          <Link2 className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-primary" />
        ) : value ? (
          <Link2Off className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>No matching ingredients</CommandEmpty>
            <CommandGroup>
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  onSelect={() => {
                    onChange(r.name, r.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("h-4 w-4", linkedId === r.id ? "opacity-100" : "opacity-0")}
                  />
                  <span className="flex-1 truncate">{r.name}</span>
                  {r.brand ? (
                    <span className="text-xs text-muted-foreground">{r.brand}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
