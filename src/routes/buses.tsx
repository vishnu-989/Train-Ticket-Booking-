import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Bus, Calendar, Clock, IndianRupee, Search, Star, CheckCircle2 } from "lucide-react";
import { BUS_CITIES, searchBuses, generateBusPNR, type BusResult } from "@/lib/buses";
import { addLocalBooking } from "@/lib/localBookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const schema = z.object({
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  date: z.string().optional().default(""),
});

export const Route = createFileRoute("/buses")({
  validateSearch: schema,
  head: () => ({
    meta: [
      { title: "Book Bus Tickets — RailGo" },
      { name: "description", content: "Search and book AC sleeper, Volvo, and Mercedes bus tickets across India." },
    ],
  }),
  component: BusesPage,
});

function BusesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(search.from || "DEL");
  const [to, setTo] = useState(search.to || "BOM");
  const [date, setDate] = useState(search.date || today);

  const results = useMemo(
    () => (search.from && search.to ? searchBuses(search.from, search.to) : []),
    [search.from, search.to],
  );

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/buses", search: { from, to, date } });
  }

  const fromCity = BUS_CITIES.find((c) => c.code === search.from)?.name;
  const toCity = BUS_CITIES.find((c) => c.code === search.to)?.name;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Bus className="h-7 w-7 text-primary" /> Bus tickets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AC sleeper, Volvo, Mercedes — across 26+ Indian cities.</p>
      </div>

      <form onSubmit={onSearch} className="rounded-2xl bg-card shadow-soft border border-border/60 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <CityField label="From" value={from} onChange={setFrom} />
          <CityField label="To" value={to} onChange={setTo} />
          <Field label="Date" icon={<Calendar className="h-4 w-4" />}>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-11 border-0 shadow-none px-2 font-medium" />
          </Field>
          <Button type="submit" className="h-12 md:self-end px-5 bg-foreground text-background hover:bg-foreground/90 gap-2">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>

      {search.from && search.to && (
        <div className="mt-8 mb-5">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            {fromCity} <ArrowRight className="h-5 w-5 text-muted-foreground" /> {toCity}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(search.date || today).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {results.length} buses
          </p>
        </div>
      )}

      {results.length === 0 && search.from && search.to ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Bus className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No buses found. Try a different route.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((b) => (
            <BusCard key={b.id} bus={b} from={fromCity ?? from} to={toCity ?? to} date={search.date || today} />
          ))}
        </div>
      )}
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{icon}</span>{label}
      </div>
      {children}
    </div>
  );
}

function CityField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 border-0 shadow-none px-0 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUS_CITIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BusCard({ bus, from, to, date }: { bus: BusResult; from: string; to: string; date: string }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{ pnr: string; seat: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || phone.length < 10) {
      toast.error("Enter valid name and 10-digit phone");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Please sign in"); return; }
    const seatNum = `U${Math.floor(Math.random() * 30) + 1}`;
    const pnr = generateBusPNR();
    addLocalBooking({
      type: "bus", pnr, operator: bus.operator, subtitle: bus.type,
      from, to, date, departure: bus.departure, arrival: bus.arrival,
      seat: seatNum, passenger: name, fare: bus.fare, userId: u.user.id,
    });
    setConfirmed({ pnr, seat: seatNum });
    toast.success("Bus ticket confirmed!");
  }


  return (
    <article className="rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-elevated hover:border-primary/30 transition p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-center">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-base font-semibold">{bus.operator}</h3>
            <span className="text-xs rounded-full bg-success/10 text-success px-2 py-0.5 flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />{bus.rating}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{bus.type}</p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <div>
              <div className="font-display font-bold text-lg tabular-nums">{bus.departure}</div>
              <div className="text-[11px] text-muted-foreground">{from}</div>
            </div>
            <div className="flex flex-col items-center text-muted-foreground">
              <div className="flex items-center gap-1 text-[11px]"><Clock className="h-3 w-3" />{bus.duration}</div>
              <div className="my-1 h-px w-12 bg-border" />
            </div>
            <div>
              <div className="font-display font-bold text-lg tabular-nums">{bus.arrival}</div>
              <div className="text-[11px] text-muted-foreground">{to}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end font-display font-bold text-xl tabular-nums">
            <IndianRupee className="h-4 w-4" />{bus.fare.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-success font-medium mt-0.5">{bus.seatsLeft} seats left</div>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Book
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmed(null); }}>
        <DialogContent>
          {confirmed ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Ticket confirmed</DialogTitle>
                <DialogDescription>Show this to the operator at boarding.</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <Row k="PNR" v={confirmed.pnr} />
                <Row k="Passenger" v={name} />
                <Row k="Operator" v={`${bus.operator} · ${bus.type}`} />
                <Row k="From → To" v={`${from} → ${to}`} />
                <Row k="Date" v={new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                <Row k="Departure" v={bus.departure} />
                <Row k="Seat" v={confirmed.seat} />
                <Row k="Fare paid" v={`₹${bus.fare.toLocaleString("en-IN")}`} />
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={confirm}>
              <DialogHeader>
                <DialogTitle>Confirm bus booking</DialogTitle>
                <DialogDescription>{bus.operator} · {from} → {to} · {bus.departure}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="As per ID" className="mt-1" />
                </div>
                <div>
                  <Label>Mobile number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" className="mt-1" />
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-display text-xl font-bold flex items-center tabular-nums">
                    <IndianRupee className="h-4 w-4" />{bus.fare.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90">Pay & confirm</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
