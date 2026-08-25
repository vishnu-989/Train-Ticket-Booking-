import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StationCombobox } from "@/components/StationCombobox";
import { BUS_CITIES } from "@/lib/buses";
import { AIRPORTS } from "@/lib/flights";
import { ArrowRight, Calendar, Search, ShieldCheck, Zap, Wallet, TrainFront, Bus, Plane } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RailGo — Book Train Tickets Fast" },
      { name: "description", content: "Search trains, pick seats, and book Indian railway tickets in seconds with RailGo." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<"train" | "bus" | "flight">("train");
  const [from, setFrom] = useState("NDLS");
  const [to, setTo] = useState("BCT");
  const [busFrom, setBusFrom] = useState("DEL");
  const [busTo, setBusTo] = useState("BOM");
  const [flyFrom, setFlyFrom] = useState("DEL");
  const [flyTo, setFlyTo] = useState("BOM");
  const [date, setDate] = useState(today);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "train") navigate({ to: "/search", search: { from, to, date } });
    else if (mode === "bus") navigate({ to: "/buses", search: { from: busFrom, to: busTo, date } });
    else navigate({ to: "/flights", search: { from: flyFrom, to: flyTo, date } });
  }

  function swap() {
    if (mode === "train") { setFrom(to); setTo(from); }
    else if (mode === "bus") { setBusFrom(busTo); setBusTo(busFrom); }
    else { setFlyFrom(flyTo); setFlyTo(flyFrom); }
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-32 sm:pt-24 sm:pb-40">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Zap className="h-3.5 w-3.5" /> Trains, buses & flights — one place
            </div>
            <h1 className="mt-5 font-display text-4xl sm:text-6xl font-bold text-white text-balance leading-[1.05]">
              Travel, made simple.
            </h1>
            <p className="mt-4 text-lg text-white/85 max-w-xl">
              Search, choose your seat, and confirm your ticket in under a minute. No clutter, no captchas, just travel.
            </p>
          </div>
        </div>
      </section>

      {/* Search card */}
      <section className="relative -mt-24 sm:-mt-28 mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl bg-card shadow-elevated border border-border/60 overflow-hidden">
          {/* Mode tabs */}
          <div className="flex border-b border-border/60 bg-muted/30">
            {[
              { id: "train", label: "Trains", icon: <TrainFront className="h-4 w-4" /> },
              { id: "bus", label: "Buses", icon: <Bus className="h-4 w-4" /> },
              { id: "flight", label: "Flights", icon: <Plane className="h-4 w-4" /> },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as typeof mode)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition ${
                  mode === m.id
                    ? "bg-card text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={onSearch} className="p-5 sm:p-7">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_1fr_auto]">
              {mode === "train" ? (
                <>
                  <StationCombobox label="From" value={from} onChange={setFrom} />
                  <SwapBtn onClick={swap} />
                  <StationCombobox label="To" value={to} onChange={setTo} />
                </>
              ) : mode === "bus" ? (
                <>
                  <CitySelect label="From" value={busFrom} onChange={setBusFrom} options={BUS_CITIES.map((c) => ({ code: c.code, label: c.name }))} />
                  <SwapBtn onClick={swap} />
                  <CitySelect label="To" value={busTo} onChange={setBusTo} options={BUS_CITIES.map((c) => ({ code: c.code, label: c.name }))} />
                </>
              ) : (
                <>
                  <CitySelect label="From" value={flyFrom} onChange={setFlyFrom} options={AIRPORTS.map((a) => ({ code: a.code, label: `${a.city} (${a.code})` }))} />
                  <SwapBtn onClick={swap} />
                  <CitySelect label="To" value={flyTo} onChange={setFlyTo} options={AIRPORTS.map((a) => ({ code: a.code, label: `${a.city} (${a.code})` }))} />
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {mode === "flight" ? "Departure" : "Journey date"}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-12 pl-9 text-base font-medium" />
                </div>
              </div>
              <Button type="submit" size="lg" className="md:self-end h-12 px-6 bg-foreground text-background hover:bg-foreground/90 gap-2">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </form>
        </div>

        {/* Quick routes */}
        {mode === "train" && (
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className="text-xs text-muted-foreground self-center mr-2">Popular:</span>
            {[
              ["NDLS", "BCT", "Delhi → Mumbai"],
              ["HWH", "NDLS", "Howrah → Delhi"],
              ["SBC", "NDLS", "Bengaluru → Delhi"],
              ["NDLS", "TVC", "Delhi → Trivandrum"],
            ].map(([f, t, label]) => (
              <Link key={label} to="/search" search={{ from: f, to: t, date: today }} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
                {label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20 sm:py-28">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: <Zap className="h-5 w-5" />, title: "Lightning fast", body: "Search and book in seconds. No reload roulette." },
            { icon: <ShieldCheck className="h-5 w-5" />, title: "Secure by design", body: "Your data and payments are protected end-to-end." },
            { icon: <Wallet className="h-5 w-5" />, title: "Best fares", body: "Transparent pricing — what you see is what you pay." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft hover:shadow-elevated transition-shadow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{f.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrainFront className="h-4 w-4" />
            <span>RailGo · A modern booking experience</span>
          </div>
          <span>For demonstration — no real payments are processed.</span>
        </div>
      </footer>
    </main>
  );
}

function SwapBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="hidden md:flex self-end mb-2 h-11 w-11 items-center justify-center rounded-full border border-border bg-background hover:bg-accent/30 hover:border-primary/40 transition" aria-label="Swap">
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function CitySelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { code: string; label: string }[] }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 text-base font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
