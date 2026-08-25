import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrainFront, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — RailGo" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      setError("This reset link is invalid or expired.");
      return;
    }
    setValid(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <Link to="/" className="mx-auto mb-6 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
          <TrainFront className="h-5 w-5" />
        </div>
        <span className="font-display text-2xl font-bold">RailGo</span>
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card shadow-soft p-6 sm:p-8">
        <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <h1 className="font-display text-2xl font-bold">Set new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter a new password for your account.</p>

        {error ? (
          <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !valid}
              className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
