import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TrainFront, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";



const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — RailGo" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Sign in state
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");
  // Sign up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");
  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirectTo || "/", replace: true });
    });
  }, [navigate, redirectTo]);


  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: redirectTo || "/", replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: suName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You're signed in.");
    navigate({ to: redirectTo || "/", replace: true });
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) return toast.error(error.message);
    toast.success("If this email is registered, you'll receive a reset link.");
    setForgotOpen(false);
    setForgotEmail("");
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
        <h1 className="font-display text-2xl font-bold text-center">Welcome aboard</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to book and manage your tickets</p>

        <p className="mt-3 text-center text-xs text-muted-foreground">Only registered users can access RailGo. Create an account to get started.</p>


        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-3 mt-4">
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <Input type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} className="h-11 pl-9" />
              </Field>
              <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                <Input type="password" required minLength={6} value={siPwd} onChange={(e) => setSiPwd(e.target.value)} className="h-11 pl-9" />
              </Field>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <div className="flex justify-end">
                <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset password</DialogTitle>
                      <DialogDescription>Enter your registered email and we'll send you a reset link.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-3 mt-4">
                      <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                        <Input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="h-11 pl-9" />
                      </Field>
                      <Button type="submit" disabled={forgotLoading} className="w-full h-11">
                        {forgotLoading ? "Sending…" : "Send reset link"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </TabsContent>


          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3 mt-4">
              <Field label="Full name" icon={<User className="h-4 w-4" />}>
                <Input required value={suName} onChange={(e) => setSuName(e.target.value)} className="h-11 pl-9" />
              </Field>
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <Input type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className="h-11 pl-9" />
              </Field>
              <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                <Input type="password" required minLength={6} value={suPwd} onChange={(e) => setSuPwd(e.target.value)} className="h-11 pl-9" />
              </Field>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  );
}
