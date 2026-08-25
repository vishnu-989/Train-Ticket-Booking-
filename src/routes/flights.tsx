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
import { ArrowRight, Plane, Calendar, IndianRupee, Search, CheckCircle2 } from "lucide-react";
import { AIRPORTS, searchFlights, generateFlightPNR, type FlightResult } from "@/lib/flights";
import { addLocalBooking } from "@/lib/localBookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const schema = z.object({
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  date: z.string().optional().default(""),
});

export const Route = createFileRoute("/flights")({
  validateSearch: schema,
  head: () => ({
    meta: [
      { title: "Book Flight Tickets — RailGo" },
      { name: "description", content: "Compare and book domestic flights from IndiGo, Air India, Vistara, SpiceJet and more." },
    ],
  }),
  component: FlightsPage,
});

function FlightsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(search.from || "DEL");
  const [to, setTo] = useState(search.to || "BOM");
  const [date, setDate] = useState(search.date || today);

  const results = useMemo(
    () => (search.from && search.to ? searchFlights(search.from, search.to) : []),
    [search.from, search.to],
  );

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/flights", search: { from, to, date } });
  }

  const fromAp = AIRPORTS.find((a) => a.code === search.from);
  const toAp = AIRPORTS.find((a) => a.code === search.to);

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Plane className="h-7 w-7 text-primary" /> Flight tickets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">IndiGo, Air India, Vistara, SpiceJet, Akasa and more.</p>
      </div>

      <form onSubmit={onSearch} className="rounded-2xl bg-card shadow-soft border border-border/60 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <AirportField label="From" value={from} onChange={setFrom} />
          <AirportField label="To" value={to} onChange={setTo} />
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-4 w-4" /> Departure
            </div>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-11 border-0 shadow-none px-2 font-medium" />
          </div>
          <Button type="submit" className="h-12 md:self-end px-5 bg-foreground text-background hover:bg-foreground/90 gap-2">
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </form>

      {search.from && search.to && (
        <div className="mt-8 mb-5">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            {fromAp?.city} <ArrowRight className="h-5 w-5 text-muted-foreground" /> {toAp?.city}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(search.date || today).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {results.length} flights
          </p>
        </div>
      )}

      {results.length === 0 && search.from && search.to ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Plane className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No flights found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((f) => (
            <FlightCard key={f.id} flight={f} fromAp={fromAp} toAp={toAp} date={search.date || today} />
          ))}
        </div>
      )}
    </main>
  );
}

function AirportField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 border-0 shadow-none px-0 font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AIRPORTS.map((a) => (
            <SelectItem key={a.code} value={a.code}>
              {a.city} <span className="text-muted-foreground ml-1">({a.code})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FlightCard({ flight, fromAp, toAp, date }: { flight: FlightResult; fromAp: any; toAp: any; date: string }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{ pnr: string; seat: string } | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const taxes = Math.round(flight.fare * 0.18);
  const total = flight.fare + taxes;

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || phone.length < 10) {
      toast.error("Enter valid name and 10-digit phone");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Please sign in"); return; }
    const row = Math.floor(Math.random() * 30) + 1;
    const letter = "ABCDEF"[Math.floor(Math.random() * 6)];
    const seat = `${row}${letter}`;
    const pnr = generateFlightPNR();
    addLocalBooking({
      type: "flight", pnr, operator: flight.airline, subtitle: flight.flightNo,
      from: fromAp?.city ?? "", to: toAp?.city ?? "",
      fromCode: fromAp?.code, toCode: toAp?.code,
      date, departure: flight.departure, arrival: flight.arrival,
      seat, passenger: name, fare: total, userId: u.user.id,
    });
    setConfirmed({ pnr, seat });
    toast.success("Flight ticket confirmed!");
  }


  return (
    <article className="rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-elevated hover:border-primary/30 transition p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
              {flight.airlineCode}
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">{flight.airline}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{flight.flightNo}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div>
              <div className="font-display font-bold text-xl tabular-nums">{flight.departure}</div>
              <div className="text-[11px] text-muted-foreground">{fromAp?.code} · {fromAp?.city}</div>
            </div>
            <div className="flex flex-col items-center text-muted-foreground min-w-[80px]">
              <div className="text-[11px]">{flight.duration}</div>
              <div className="my-1 h-px w-16 bg-border" />
              <div className="text-[10px] uppercase">{flight.stops === 0 ? "Non-stop" : `${flight.stops} stop`}</div>
            </div>
            <div>
              <div className="font-display font-bold text-xl tabular-nums">{flight.arrival}</div>
              <div className="text-[11px] text-muted-foreground">{toAp?.code} · {toAp?.city}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end font-display font-bold text-xl tabular-nums">
            <IndianRupee className="h-4 w-4" />{flight.fare.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">+ taxes · {flight.seatsLeft} left</div>
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
                <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-success" /> Boarding pass</DialogTitle>
                <DialogDescription>Reach the airport 2 hours before departure.</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                <Row k="PNR" v={confirmed.pnr} />
                <Row k="Passenger" v={name} />
                <Row k="Flight" v={`${flight.airline} · ${flight.flightNo}`} />
                <Row k="From → To" v={`${fromAp?.city} (${fromAp?.code}) → ${toAp?.city} (${toAp?.code})`} />
                <Row k="Date" v={new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                <Row k="Departure" v={flight.departure} />
                <Row k="Seat" v={confirmed.seat} />
                <Row k="Total paid" v={`₹${total.toLocaleString("en-IN")}`} />
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={confirm}>
              <DialogHeader>
                <DialogTitle>Confirm flight booking</DialogTitle>
                <DialogDescription>{flight.airline} {flight.flightNo} · {fromAp?.code} → {toAp?.code}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                <div>
                  <Label>Full name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="As per government ID" className="mt-1" />
                </div>
                <div>
                  <Label>Mobile number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit" className="mt-1" />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1.5">
                  <Row k="Base fare" v={`₹${flight.fare.toLocaleString("en-IN")}`} />
                  <Row k="Taxes & fees (18%)" v={`₹${taxes.toLocaleString("en-IN")}`} />
                  <div className="border-t border-border pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-display tabular-nums flex items-center"><IndianRupee className="h-4 w-4" />{total.toLocaleString("en-IN")}</span>
                  </div>
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
