"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState, type FormEvent } from "react";
import { Hash, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get("callbackUrl") ?? "/dashboard";
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 text-white">
      <form onSubmit={(e) => void handleSubmit(e)} className="glass w-full max-w-sm rounded-2xl p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,.2)]">
            <Hash className="size-4 text-blue-300" />
          </span>
          <div>
            <strong className="block text-sm">Tempo</strong>
            <span className="text-xs text-slate-500">Team workspace</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Team members only.</p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <input
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
            placeholder="Email" type="email" autoComplete="email" required
          />
          <input
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
            placeholder="Password" type="password" autoComplete="current-password" required
          />
          <button disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold disabled:opacity-60 hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]"
            type="submit">
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link className="text-blue-400 hover:text-blue-300" href="/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
