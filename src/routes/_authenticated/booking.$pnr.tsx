import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowRight, Calendar, CheckCircle2, Clock, IndianRupee, MapPin, TrainFront } from "lucide-react";
import { toast } from "sonner";

type Booking = {
  id: string; pnr: string; train_number: string; train_name: string;
  source_code: string; source_station: string; destination_code: string; destination_station: string;
  departure_time: string; arrival_time: string; journey_date: string;
  class_code: string; class_name: string; total_fare: number; status: string; payment_status: string;
  passengers: { id: string; name: string; age: number; gender: string; seat_number: string; berth_preference: string; status: string }[];
};

export const Route = createFileRoute("/_authenticated/booking/$pnr")({
  head: () => ({ meta: [{ title: "Ticket — RailGo" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { pnr } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: ["booking", pnr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, passengers(*)")
        .eq("pnr", pnr)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error(`No booking found for PNR ${pnr}`);
      return data as unknown as Booking;
    },
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 4000),
  });

  async function handleCancel() {
    if (!booking) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", booking.id);
    if (error) return toast.error(error.message);
    await supabase.from("passengers").update({ status: "CANCELLED" }).eq("booking_id", booking.id);
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["booking", pnr] });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-96 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">Couldn't load your ticket</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Please try again in a moment."}
        </p>
        <div className="mt-5 flex gap-2 justify-center">
          <Button onClick={() => refetch()}>Retry</Button>
          <Button variant="outline" asChild><Link to="/bookings">All bookings</Link></Button>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === "CANCELLED";

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      {!isCancelled && (
        <div className="mb-5 rounded-2xl bg-success/10 border border-success/30 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-success-foreground">Booking confirmed</div>
            <div className="text-sm text-muted-foreground">Your e-ticket is ready. Carry a valid ID at boarding.</div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card border border-border/60 shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-hero text-primary-foreground p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-80">RailGo · E-Ticket</div>
              <h1 className="mt-1 font-display text-2xl font-bold">{booking.train_name}</h1>
              <div className="mt-1 text-sm opacity-90 font-mono">{booking.train_number} · {booking.class_code} {booking.class_name}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider opacity-80">PNR</div>
              <div className="font-mono text-xl font-bold tabular-nums">{booking.pnr}</div>
              {isCancelled && <div className="mt-1 inline-block rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Cancelled</div>}
            </div>
          </div>
        </div>

        {/* Journey */}
        <div className="p-6 border-b border-border">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div>
              <div className="text-3xl font-display font-bold tabular-nums">{booking.departure_time}</div>
              <div className="mt-1 text-sm font-medium">{booking.source_station}</div>
              <div className="text-xs text-muted-foreground">{booking.source_code}</div>
            </div>
            <div className="flex flex-col items-center text-muted-foreground">
              <TrainFront className="h-5 w-5 text-primary" />
              <div className="my-2 h-px w-20 bg-border" />
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-display font-bold tabular-nums">{booking.arrival_time}</div>
              <div className="mt-1 text-sm font-medium">{booking.destination_station}</div>
              <div className="text-xs text-muted-foreground">{booking.destination_code}</div>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-medium text-foreground">
              {new Date(booking.journey_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Passengers */}
        <div className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passengers</h2>
          <div className="mt-3 divide-y divide-border">
            {booking.passengers.map((p, i) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{i + 1}. {p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.age} · {p.gender} · {p.berth_preference}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">{p.seat_number}</div>
                  <div className="text-[10px] uppercase tracking-wider text-success font-semibold">{p.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fare */}
        <div className="border-t border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total paid</div>
          <div className="font-display text-xl font-bold flex items-center tabular-nums">
            <IndianRupee className="h-4 w-4" />{Number(booking.total_fare).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/bookings">All bookings</Link></Button>
        <Button asChild variant="outline"><Link to="/">Book another</Link></Button>
        {!isCancelled && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive">Cancel booking</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  PNR {booking.pnr} will be cancelled. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep booking</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, cancel</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </main>
  );
}
