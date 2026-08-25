import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Account — RailGo" }] }),
  component: AccountPage,
});

function AccountPage() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    if (pwd !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPwd("");
    setConfirm("");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage your security and preferences.</p>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card shadow-soft p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Change password</h2>
            <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} className="h-11 pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 pl-9" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="h-11 bg-foreground text-background hover:bg-foreground/90">
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
