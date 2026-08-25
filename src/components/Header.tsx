import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TrainFront, Ticket, LogOut, User, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft group-hover:shadow-elevated transition-shadow">
            <TrainFront className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">RailGo</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }} activeOptions={{ exact: true }}>
            Trains
          </Link>
          <Link to="/buses" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}>
            Buses
          </Link>
          <Link to="/flights" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}>
            Flights
          </Link>
          {email && (
            <Link to="/bookings" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "px-3 py-2 text-sm font-medium text-foreground" }}>
              My Bookings
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {email ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:inline max-w-[140px] truncate">{email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/bookings"><Ticket className="mr-2 h-4 w-4" /> My Bookings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/account"><KeyRound className="mr-2 h-4 w-4" /> Change password</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
