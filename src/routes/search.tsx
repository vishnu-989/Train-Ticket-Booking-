import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StationCombobox } from "@/components/StationCombobox";
import { STATIONS } from "@/lib/stations";
import { ArrowRight, Calendar, Search, TrainFront, Clock, IndianRupee } from "lucide-react";

const searchSchema = z.object({
  from: z.string().default(""),
  to: z.string().default(""),
  date: z.string().default(() => new Date().toISOString().slice(0, 10)),
});

type ClassInfo = { code: string; name: string; fare: number; available: number };
type Stop = { code: string; name: string; arrival: string; departure: string };
type Train = {
  id: string; train_number: string; train_name: string;
  source_code: string; source_station: string;
  destination_code: string; destination_station: string;
  departure_time: string; arrival_time: string; duration: string; distance_km: number;
  classes: ClassInfo[];
  stops: Stop[];
};

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Search Trains — RailGo" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { from, to, date } = Route.useSearch();
  const navigate = useNavigate();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [d, setD] = useState(date);

  const { data: trains, isLoading } = useQuery({
    queryKey: ["trains", from, to],
    enabled: Boolean(from && to),
    queryFn: async () => {
      const { data, error } = await supabase.from("trains").select("*");
      if (error) throw error;
      const all = (data ?? []) as unknown as Train[];
      return all.filter((train) => {
        const codes = [
          train.source_code,
          ...(train.stops ?? []).map((s) => s.code),
          train.destination_code,
        ];
        const fi = codes.indexOf(from);
        const ti = codes.indexOf(to);
        return fi !== -1 && ti !== -1 && fi < ti;
      });
    },
  });

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/search", search: { from: f, to: t, date: d } });
  }

  const fromName = STATIONS.find((s) => s.code === from)?.name ?? from;
  const toName = STATIONS.find((s) => s.code === to)?.name ?? to;
  const dateLabel = new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      {/* compact search bar */}
      <form onSubmit={onSearch} className="rounded-2xl bg-card shadow-soft border border-border/60 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">From</div>
            <StationCombobox value={f} onChange={setF} compact />
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">To</div>
            <StationCombobox value={t} onChange={setT} compact />
          </div>
          <CompactField label="Date" icon={<Calendar className="h-4 w-4" />}>
            <Input type="date" value={d} onChange={(e) => setD(e.target.value)} className="h-11 border-0 shadow-none px-2 font-medium" />
          </CompactField>
          <Button type="submit" className="h-12 md:self-end px-5 bg-foreground text-background hover:bg-foreground/90 gap-2">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>

      {/* results header */}
      <div className="mt-8 mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 flex-wrap">
            {fromName} <ArrowRight className="h-5 w-5 text-muted-foreground" /> {toName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{dateLabel} · {isLoading ? "Searching…" : `${trains?.length ?? 0} trains`}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : !trains || trains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <TrainFront className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-semibold">No trains found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different route or date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trains.map((train) => <TrainResultCard key={train.id} train={train} date={date} from={from} to={to} />)}
        </div>
      )}
    </main>
  );
}

function CompactField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{icon}</span>{label}
      </div>
      {children}
    </div>
  );
}

function TrainResultCard({ train, date, from, to }: { train: Train; date: string; from: string; to: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Find boarding/alighting stops for this segment
  const fullRoute: Stop[] = [
    { code: train.source_code, name: train.source_station, arrival: "Source", departure: train.departure_time },
    ...(train.stops ?? []).filter((s) => s.code !== train.source_code && s.code !== train.destination_code),
    { code: train.destination_code, name: train.destination_station, arrival: train.arrival_time, departure: "Destination" },
  ];
  const board = fullRoute.find((s) => s.code === from);
  const alight = fullRoute.find((s) => s.code === to);
  const boardTime = board?.departure && board.departure !== "Destination" ? board.departure : board?.arrival ?? train.departure_time;
  const alightTime = alight?.arrival && alight.arrival !== "Source" ? alight.arrival : alight?.departure ?? train.arrival_time;

  return (
    <article className="rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-elevated hover:border-primary/30 transition overflow-hidden">
      <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{train.train_number}</span>
            <span>·</span>
            <span>Runs daily</span>
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold">{train.train_name}</h3>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-md">
            <div>
              <div className="text-2xl font-display font-bold tabular-nums">{boardTime}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{board?.code ?? from} · {board?.name ?? from}</div>
            </div>
            <div className="flex flex-col items-center text-muted-foreground">
              <div className="flex items-center gap-1 text-xs"><Clock className="h-3 w-3" />{train.duration}</div>
              <div className="my-1.5 h-px w-16 bg-border relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="text-[10px] uppercase tracking-wider">{train.distance_km} km</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-display font-bold tabular-nums">{alightTime}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{alight?.code ?? to} · {alight?.name ?? to}</div>
            </div>
          </div>

          {(train.source_code !== from || train.destination_code !== to) && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Full route: {train.source_station} ({train.departure_time}) → {train.destination_station} ({train.arrival_time})
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30 px-5 sm:px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {train.classes.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelected(c.code === selected ? null : c.code)}
              className={`group rounded-xl border px-3.5 py-2.5 text-left transition ${selected === c.code ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.code}</div>
                  <div className="text-sm font-medium">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-sm font-semibold tabular-nums">
                    <IndianRupee className="h-3.5 w-3.5" />{c.fare.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-success font-medium">{c.available} avail</div>
                </div>
              </div>
            </button>
          ))}
          <div className="ml-auto">
            {selected ? (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                <Link to="/book/$trainId" params={{ trainId: train.id }} search={{ date, classCode: selected }}>
                  Book {selected} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Select a class to continue</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
