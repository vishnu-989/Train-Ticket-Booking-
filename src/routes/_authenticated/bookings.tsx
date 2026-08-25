import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight, Calendar, IndianRupee, Ticket, TrainFront, User, Bus, Plane, XCircle,
} from "lucide-react";
import { listLocalBookings, cancelLocalBooking, type LocalBooking } from "@/lib/localBookings";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "My Bookings — RailGo" }] }),
  component: BookingsPage,
});

type TrainBooking = {
  id: string; pnr: string; train_number: string; train_name: string;
  source_code: string; source_station: string; destination_code: string; destination_station: string;
  departure_time: string; arrival_time: string; journey_date: string;
  class_code: string; class_name: string; total_fare: number; status: string;
  passengers?: { name: string; seat_number: string }[];
};

function BookingsPage() {
  const qc = useQueryClient();
  const [local, setLocal] = useState<LocalBooking[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (active && data.user) setLocal(listLocalBookings(data.user.id));
    }
    load();
    const onUpd = () => load();
    window.addEventListener("railgo:bookings-updated", onUpd);
    return () => { active = false; window.removeEventListener("railgo:bookings-updated", onUpd); };
  }, []);

  const { data: trains, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, passengers(name, seat_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainBooking[];
    },
  });

  async function cancelTrain(id: string) {
    if (!confirm("Cancel this booking? Refund will be processed per IRCTC rules.")) return;
    const { error } = await supabase.from("bookings").update({ status: "CANCELLED" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  function cancelLocal(id: string) {
    if (!confirm("Cancel this booking?")) return;
    cancelLocalBooking(id);
    toast.success("Booking cancelled");
  }

  const activeTrains = (trains ?? []).filter((b) => b.status !== "CANCELLED");
  const cancelledTrains = (trains ?? []).filter((b) => b.status === "CANCELLED");
  const activeLocal = local.filter((b) => b.status === "CONFIRMED");
  const cancelledLocal = local.filter((b) => b.status === "CANCELLED");

  const activeCount = activeTrains.length + activeLocal.length;
  const cancelledCount = cancelledTrains.length + cancelledLocal.length;

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-bold">My Bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Trains, buses and flights — all in one place.</p>

      <Tabs defaultValue="active" className="mt-6">
        <TabsList>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-5">
          {isLoading ? (
            <div className="space-y-3">{[0,1].map((i) => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}</div>
          ) : activeCount === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              {activeTrains.map((b) => <TrainCard key={b.id} b={b} onCancel={() => cancelTrain(b.id)} />)}
              {activeLocal.map((b) => <LocalCard key={b.id} b={b} onCancel={() => cancelLocal(b.id)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-5">
          {cancelledCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No cancelled bookings.
            </div>
          ) : (
            <div className="space-y-4">
              {cancelledTrains.map((b) => <TrainCard key={b.id} b={b} cancelled />)}
              {cancelledLocal.map((b) => <LocalCard key={b.id} b={b} cancelled />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 font-display text-lg font-semibold">No bookings yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Search trains, buses or flights to make your first booking.</p>
      <Button asChild className="mt-5 bg-foreground text-background hover:bg-foreground/90">
        <Link to="/">Start searching</Link>
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cancelled = status === "CANCELLED";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cancelled ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
      {status}
    </span>
  );
}

function TrainCard({ b, onCancel, cancelled }: { b: TrainBooking; onCancel?: () => void; cancelled?: boolean }) {
  return (
    <article className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrainFront className="h-3.5 w-3.5" />
              <span className="font-mono">{b.train_number}</span>
              <span>·</span>
              <StatusPill status={b.status} />
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold">{b.train_name}</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PNR</div>
            <div className="font-mono text-base font-semibold tabular-nums">{b.pnr}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md">
          <div>
            <div className="text-xl font-display font-bold tabular-nums">{b.departure_time}</div>
            <div className="text-xs text-muted-foreground">{b.source_code} · {b.source_station}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <div className="text-xl font-display font-bold tabular-nums">{b.arrival_time}</div>
            <div className="text-xs text-muted-foreground">{b.destination_code} · {b.destination_station}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(b.journey_date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {b.passengers?.length ?? 0} passenger{(b.passengers?.length ?? 0) > 1 ? "s" : ""}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">{b.class_code}</span>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30 px-5 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center text-sm font-semibold tabular-nums">
          <IndianRupee className="h-3.5 w-3.5" />{Number(b.total_fare).toLocaleString("en-IN")}
        </div>
        <div className="flex items-center gap-2">
          {!cancelled && onCancel && (
            <Button onClick={onCancel} variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link to="/booking/$pnr" params={{ pnr: b.pnr }}>View ticket <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function LocalCard({ b, onCancel, cancelled }: { b: LocalBooking; onCancel?: () => void; cancelled?: boolean }) {
  const Icon = b.type === "bus" ? Bus : Plane;
  return (
    <article className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="uppercase font-semibold">{b.type}</span>
              <span>·</span>
              <span className="font-mono">{b.subtitle}</span>
              <span>·</span>
              <StatusPill status={b.status} />
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold">{b.operator}</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PNR</div>
            <div className="font-mono text-base font-semibold tabular-nums">{b.pnr}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md">
          <div>
            <div className="text-xl font-display font-bold tabular-nums">{b.departure}</div>
            <div className="text-xs text-muted-foreground">{b.fromCode ? `${b.fromCode} · ` : ""}{b.from}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <div className="text-xl font-display font-bold tabular-nums">{b.arrival}</div>
            <div className="text-xs text-muted-foreground">{b.toCode ? `${b.toCode} · ` : ""}{b.to}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(b.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {b.passenger}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">Seat {b.seat}</span>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30 px-5 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center text-sm font-semibold tabular-nums">
          <IndianRupee className="h-3.5 w-3.5" />{Number(b.fare).toLocaleString("en-IN")}
        </div>
        {!cancelled && onCancel && (
          <Button onClick={onCancel} variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive">
            <XCircle className="h-3.5 w-3.5" /> Cancel
          </Button>
        )}
      </div>
    </article>
  );
}
