"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

type FieldErrors = Partial<Record<"name" | "email" | "password", string[]>>;

function validatePassword(pw: string): string {
  if (pw.length < 8) return "Minimum 8 characters.";
  if (!/[A-Z]/.test(pw)) return "At least one uppercase letter required.";
  if (!/[0-9]/.test(pw)) return "At least one number required.";
  return "";
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitePin, setInvitePin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    if (!invitePin.trim()) { setError("Team access code is required."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password, invitePin }),
      });

      if (res.status === 429) {
        setError("Too many attempts. Please wait and try again.");
        return;
      }
      if (res.status === 403) {
        setError("Invalid team access code or credentials.");
        return;
      }
      if (res.status === 409) {
        setError("Unable to create account.");
        return;
      }
      if (res.status === 400) {
        const data = (await res.json()) as { errors?: FieldErrors };
        const flat = Object.values(data.errors ?? {}).flat().filter(Boolean);
        setError(flat[0] ?? "Check your details and try again.");
        return;
      }
      if (!res.ok) {
        setError("Unable to create account. Please try again.");
        return;
      }

      setDone(true);
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .field-input {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #1a1a1a;
          color: #e0e0e0;
          font-family: var(--font-geist-mono), monospace;
          font-size: 13px;
          padding: 12px 16px;
          border-radius: 10px;
          outline: none;
          letter-spacing: 0.03em;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: #333; }
        .field-input:focus {
          border-color: #00ff8850;
          box-shadow: 0 0 0 3px #00ff8810;
        }
        .field-input.pin-field:focus {
          border-color: #ff336650;
          box-shadow: 0 0 0 3px #ff336610;
        }
        .btn-submit {
          width: 100%;
          background: #00ff88;
          color: #000;
          font-family: var(--font-geist-mono), monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .btn-submit:not(:disabled):hover {
          box-shadow: 0 0 32px #00ff8860, 0 4px 16px rgba(0,0,0,0.4);
          transform: translateY(-1px);
        }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .cursor { display:inline-block; width:0.5em; height:1em; background:#00ff88; margin-left:3px; vertical-align:text-bottom; animation:blink 1s step-end infinite; }
        .divider { height:1px; background:linear-gradient(90deg,transparent,#1a1a1a,transparent); }
      `}</style>

      <main
        className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ background: "#030303" }}
      >
        {/* Background grid */}
        <div aria-hidden="true" style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div aria-hidden="true" style={{
          position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%", zIndex: 0,
          background: "radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)",
        }} />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo */}
          <div className="fade-up flex items-center gap-3 mb-10">
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "#0a0a0a", border: "1px solid #00ff8840",
              display: "grid", placeItems: "center",
              boxShadow: "0 0 16px #00ff8820",
            }}>
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
                <rect x="4" y="7.5" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="4" y="11" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="7.5" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
                <rect x="11" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
              </svg>
            </div>
            <div>
              <span className="font-mono text-sm font-bold tracking-widest" style={{ color: "#f0f0f0" }}>HASH BROWNS</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff3366", display: "block" }} />
                <span className="font-mono text-xs" style={{ color: "#ff3366", letterSpacing: "0.1em" }}>ACCESS RESTRICTED</span>
              </div>
            </div>
          </div>

          {/* Card */}
          <div
            className="fade-up rounded-2xl p-8"
            style={{
              background: "#080808",
              border: "1px solid #141414",
              boxShadow: "0 0 80px rgba(0,0,0,0.5)",
              animationDelay: "0.1s",
            }}
          >
            {/* Terminal header bar */}
            <div className="flex items-center gap-2 mb-8 pb-5" style={{ borderBottom: "1px solid #111" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c940" }} />
              <span className="font-mono text-xs ml-2" style={{ color: "#333", letterSpacing: "0.1em" }}>
                register — tempo@hashbrowns
              </span>
            </div>

            <div className="font-mono text-xs mb-1" style={{ color: "#333", letterSpacing: "0.12em" }}>
              $ tempo register --team hashbrowns<span className="cursor" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#f0f0f0", fontFamily: "var(--font-geist-mono)" }}>
              Create account
            </h1>
            <p className="text-xs mb-8" style={{ color: "#444", fontFamily: "var(--font-geist-mono)" }}>
              Team access code required. Ask your lead.
            </p>

            {error && (
              <div
                className="font-mono text-xs rounded-xl px-4 py-3 mb-6 flex items-start gap-2"
                style={{ background: "#1a0a0a", border: "1px solid #ff336630", color: "#ff6688" }}
              >
                <span style={{ color: "#ff3366", flexShrink: 0 }}>✗</span>
                {error}
              </div>
            )}

            {done && (
              <div
                className="font-mono text-xs rounded-xl px-4 py-3 mb-6"
                style={{ background: "#0a1a0e", border: "1px solid #00ff8830", color: "#00ff88" }}
              >
                ✓ Account created — redirecting…
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="font-mono text-xs block mb-1.5" style={{ color: "#444", letterSpacing: "0.1em" }}>
                  HANDLE
                </label>
                <input
                  className="field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="display name / handle"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="font-mono text-xs block mb-1.5" style={{ color: "#444", letterSpacing: "0.1em" }}>
                  EMAIL
                </label>
                <input
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="font-mono text-xs block mb-1.5" style={{ color: "#444", letterSpacing: "0.1em" }}>
                  PASSWORD
                </label>
                <input
                  className="field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min 8 chars · 1 uppercase · 1 number"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>

              {/* PIN field — visually distinct as "restricted" */}
              <div className="pt-3">
                <div className="divider mb-5" />
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ color: "#ff3366", fontSize: 10 }}>◈</span>
                  <label className="font-mono text-xs" style={{ color: "#ff3366", letterSpacing: "0.12em" }}>
                    TEAM ACCESS CODE
                  </label>
                </div>
                <input
                  className="field-input pin-field"
                  value={invitePin}
                  onChange={(e) => setInvitePin(e.target.value)}
                  placeholder="provided by your team lead"
                  type="password"
                  autoComplete="off"
                  required
                />
                <p className="font-mono text-xs mt-2" style={{ color: "#2a2a2a", letterSpacing: "0.05em" }}>
                  Verified server-side. Never stored or transmitted in plaintext.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || done}
                  className="btn-submit"
                >
                  {loading ? "AUTHENTICATING..." : "CREATE ACCOUNT ——›"}
                </button>
              </div>
            </form>

            <p className="font-mono text-xs text-center mt-6" style={{ color: "#333" }}>
              Already have access?{" "}
              <Link href="/login" style={{ color: "#00ff88" }}>
                Sign in
              </Link>
            </p>
          </div>

          <p className="font-mono text-xs text-center mt-6" style={{ color: "#1a1a1a" }}>
            PRIVATE · E2E ENCRYPTED · SELF-HOSTED
          </p>
        </div>
      </main>
    </>
  );
}
