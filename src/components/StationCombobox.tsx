import { useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { STATIONS } from "@/lib/stations";

type Props = {
  label?: string;
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  compact?: boolean;
};

export function StationCombobox({ label, value, onChange, placeholder = "Select station", compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const selected = STATIONS.find((s) => s.code === value);

  return (
    <div className="space-y-1.5 min-w-0">
      {label && (
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-medium",
              compact ? "h-11 border-0 shadow-none px-2" : "h-12 text-base",
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              {selected ? (
                <span className="truncate">
                  {selected.name}{" "}
                  <span className="text-xs text-muted-foreground">{selected.code}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command
            filter={(itemValue, search) => {
              if (!search) return 1;
              return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder="Search city, station, or code…" />
            <CommandList>
              <CommandEmpty>No station found.</CommandEmpty>
              <CommandGroup>
                {STATIONS.map((s) => (
                  <CommandItem
                    key={s.code}
                    value={`${s.name} ${s.code}`}
                    onSelect={() => {
                      onChange(s.code);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === s.code ? "opacity-100" : "opacity-0")} />
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{s.code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
