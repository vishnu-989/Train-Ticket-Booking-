import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, IndianRupee, Plus, Trash2, User, ShieldCheck, Clock } from "lucide-react";
import { generatePNR, generateSeat } from "@/lib/stations";
import { toast } from "sonner";

const searchSchema = z.object({ date: z.string(), classCode: z.string() });

type ClassInfo = { code: string; name: string; fare: number; available: number };
type Train = {
  id: string; train_number: string; train_name: string;
  source_code: string; source_station: string;
  destination_code: string; destination_station: string;
  departure_time: string; arrival_time: string; duration: string;
  classes: ClassInfo[];
};

type Passenger = { name: string; age: string; gender: string; berth: string };

export const Route = createFileRoute("/_authenticated/book/$trainId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Book your seats — RailGo" }] }),
  component: BookPage,
});

function BookPage() {
  const { trainId } = Route.useParams();
  const { date, classCode } = Route.useSearch();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", age: "", gender: "Male", berth: "No Preference" },
  ]);

  const { data: train, isLoading } = useQuery({
    queryKey: ["train", trainId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trains").select("*").eq("id", trainId).single();
      if (error) throw error;
      return data as unknown as Train;
    },
  });

  const selectedClass = useMemo(
    () => train?.classes.find((c) => c.code === classCode),
    [train, classCode]
  );

  const fareBreakdown = useMemo(() => {
    const code = selectedClass?.code ?? "";
    const isAC = ["1A", "2A", "3A", "CC", "EC"].includes(code);
    const reservationPer: Record<string, number> =
      { "1A": 60, "2A": 50, "3A": 40, "CC": 40, "EC": 50, "SL": 20, "2S": 15 };
    const superfastPer: Record<string, number> =
      { "1A": 75, "2A": 65, "3A": 65, "CC": 65, "EC": 75, "SL": 45, "2S": 30 };
    const n = passengers.length;
    const baseFare = (selectedClass?.fare ?? 0) * n;
    const reservation = (reservationPer[code] ?? 30) * n;
    const superfast = (superfastPer[code] ?? 30) * n;
    const subtotal = baseFare + reservation + superfast;
    const gst = isAC ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + gst;
    return { baseFare, reservation, superfast, gst, total, isAC };
  }, [selectedClass, passengers.length]);

  function updatePax(i: number, key: keyof Passenger, value: string) {
    setPassengers((arr) => arr.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }
  function addPax() {
    if (passengers.length >= 6) return toast.warning("Max 6 passengers per booking");
    setPassengers((arr) => [...arr, { name: "", age: "", gender: "Male", berth: "No Preference" }]);
  }
  function removePax(i: number) {
    setPassengers((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!train || !selectedClass) return;

    for (const p of passengers) {
      if (!p.name.trim() || !p.age || Number(p.age) < 1 || Number(p.age) > 120) {
        return toast.error("Please fill valid passenger details");
      }
    }

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const pnr = generatePNR();
      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          pnr,
          user_id: userData.user.id,
          train_id: train.id,
          train_number: train.train_number,
          train_name: train.train_name,
          source_code: train.source_code,
          source_station: train.source_station,
          destination_code: train.destination_code,
          destination_station: train.destination_station,
          departure_time: train.departure_time,
          arrival_time: train.arrival_time,
          journey_date: date,
          class_code: selectedClass.code,
          class_name: selectedClass.name,
          total_fare: fareBreakdown.total,
          status: "CONFIRMED",
          payment_status: "PAID",
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const paxRows = passengers.map((p, i) => ({
        booking_id: booking.id,
        name: p.name.trim(),
        age: Number(p.age),
        gender: p.gender,
        seat_number: generateSeat(selectedClass.code, Math.floor(Math.random() * 256) + i),
        berth_preference: p.berth,
        status: "CONFIRMED",
      }));
      const { error: pErr } = await supabase.from("passengers").insert(paxRows);
      if (pErr) throw pErr;

      toast.success("Booking confirmed!");
      navigate({ to: "/booking/$pnr", params: { pnr } });
    } catch (err: any) {
      toast.error(err.message ?? "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !train || !selectedClass) {
    return <div className="mx-auto max-w-5xl px-4 py-12"><div className="h-64 rounded-2xl bg-muted animate-pulse" /></div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link to="/search" search={{ from: train.source_code, to: train.destination_code, date }} className="text-sm text-muted-foreground hover:text-foreground">← Back to results</Link>

      {/* Journey summary */}
      <div className="mt-4 rounded-2xl bg-card border border-border/60 shadow-soft p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{train.train_number}</div>
            <h1 className="mt-0.5 font-display text-xl font-bold">{train.train_name}</h1>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {train.duration} · {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <div className="rounded-xl bg-primary/10 px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">{selectedClass.code} · {selectedClass.name}</div>
            <div className="flex items-center justify-end font-display font-bold text-lg text-primary tabular-nums">
              <IndianRupee className="h-4 w-4" />{selectedClass.fare}<span className="ml-1 text-xs font-normal text-muted-foreground">/pax</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 max-w-md">
          <div>
            <div className="text-2xl font-display font-bold tabular-nums">{train.departure_time}</div>
            <div className="text-xs text-muted-foreground">{train.source_code} · {train.source_station}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <div className="text-2xl font-display font-bold tabular-nums">{train.arrival_time}</div>
            <div className="text-xs text-muted-foreground">{train.destination_code} · {train.destination_station}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleBook} className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Passengers */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Passenger details</h2>
              <Button type="button" variant="outline" size="sm" onClick={addPax} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add passenger
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              {passengers.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Passenger {i + 1}
                    </div>
                    {passengers.length > 1 && (
                      <button type="button" onClick={() => removePax(i)} className="text-xs text-destructive hover:underline flex items-center gap-1">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_90px_120px_150px]">
                    <div>
                      <Label className="text-xs">Full name</Label>
                      <Input required value={p.name} onChange={(e) => updatePax(i, "name", e.target.value)} className="h-10 mt-1" placeholder="As per ID" />
                    </div>
                    <div>
                      <Label className="text-xs">Age</Label>
                      <Input required type="number" min={1} max={120} value={p.age} onChange={(e) => updatePax(i, "age", e.target.value)} className="h-10 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Gender</Label>
                      <Select value={p.gender} onValueChange={(v) => updatePax(i, "gender", v)}>
                        <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Berth</Label>
                      <Select value={p.berth} onValueChange={(v) => updatePax(i, "berth", v)}>
                        <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="No Preference">No Preference</SelectItem>
                          <SelectItem value="Lower">Lower</SelectItem>
                          <SelectItem value="Middle">Middle</SelectItem>
                          <SelectItem value="Upper">Upper</SelectItem>
                          <SelectItem value="Side Lower">Side Lower</SelectItem>
                          <SelectItem value="Side Upper">Side Upper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fare summary */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Fare summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label={`Base fare × ${passengers.length}`} value={fareBreakdown.baseFare} />
              <Row label="Reservation charge" value={fareBreakdown.reservation} />
              <Row label="Superfast surcharge" value={fareBreakdown.superfast} />
              {fareBreakdown.isAC && <Row label="GST (5%)" value={fareBreakdown.gst} />}
            </dl>
            <div className="my-4 h-px bg-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total</span>
              <span className="font-display text-2xl font-bold flex items-center tabular-nums">
                <IndianRupee className="h-5 w-5" />{fareBreakdown.total.toLocaleString("en-IN")}
              </span>
            </div>

            <Button type="submit" disabled={submitting} size="lg" className="w-full mt-5 h-12 bg-foreground text-background hover:bg-foreground/90">
              {submitting ? "Confirming…" : "Pay & confirm"}
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Demo mode — no real payment is processed
            </p>
          </div>
        </aside>
      </form>
    </main>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="flex items-center text-foreground tabular-nums"><IndianRupee className="h-3 w-3" />{value.toLocaleString("en-IN")}</span>
    </div>
  );
}
