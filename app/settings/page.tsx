"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { usePersonalization } from "@/components/personalization-provider";
import {
  Bell,
  Check,
  Clock,
  Code,
  Eye,
  ExternalLink,
  Hash,
  Info,
  Keyboard,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Save,
  Shield,
  Sliders,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

type AccentColor = "blue" | "purple" | "green" | "orange" | "rose" | "cyan";

const ACCENT_COLORS: { id: AccentColor; label: string; hex: string; tw: string; shadow: string }[] = [
  { id: "blue", label: "Blue", hex: "#3b82f6", tw: "bg-blue-500", shadow: "shadow-[0_0_16px_rgba(59,130,246,.6)]" },
  { id: "purple", label: "Purple", hex: "#a855f7", tw: "bg-purple-500", shadow: "shadow-[0_0_16px_rgba(168,85,247,.6)]" },
  { id: "green", label: "Green", hex: "#22c55e", tw: "bg-green-500", shadow: "shadow-[0_0_16px_rgba(34,197,94,.6)]" },
  { id: "orange", label: "Orange", hex: "#f97316", tw: "bg-orange-500", shadow: "shadow-[0_0_16px_rgba(249,115,22,.6)]" },
  { id: "rose", label: "Rose", hex: "#f43f5e", tw: "bg-rose-500", shadow: "shadow-[0_0_16px_rgba(244,63,94,.6)]" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4", tw: "bg-cyan-500", shadow: "shadow-[0_0_16px_rgba(6,182,212,.6)]" },
];

type FontSize = "sm" | "md" | "lg";
type Tab = "profile" | "personalization" | "notifications" | "account" | "about" | "admin";

const BASE_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "personalization", label: "Personalization", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "account", label: "Account", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

const ADMIN_TAB: { id: Tab; label: string; icon: React.ElementType } = {
  id: "admin", label: "Admin", icon: Shield,
};

const SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["⌘", "N"], label: "New task" },
  { keys: ["⌘", "/"], label: "Focus search" },
  { keys: ["G", "D"], label: "Go to Dashboard" },
  { keys: ["G", "T"], label: "Go to Tasks" },
  { keys: ["G", "C"], label: "Go to Calendar" },
  { keys: ["Esc"], label: "Close modal / panel" },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { prefs, updatePrefs, savePrefs: commitPrefs } = usePersonalization();

  const isAdmin = session?.user?.role === "admin";
  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Personalization — mirror from context so edits are live
  const accent = prefs.accent;
  const fontSize = prefs.fontSize;
  const compactMode = prefs.compactMode;
  const showGrid = prefs.showGrid;
  const animationsEnabled = prefs.animationsEnabled;

  const setAccent = (v: AccentColor) => updatePrefs({ accent: v });
  const setFontSize = (v: FontSize) => updatePrefs({ fontSize: v });
  const setCompactMode = (v: boolean) => updatePrefs({ compactMode: v });
  const setShowGrid = (v: boolean) => updatePrefs({ showGrid: v });
  const setAnimationsEnabled = (v: boolean) => updatePrefs({ animationsEnabled: v });

  // Notification preferences — mirror from context
  const notifyPings = prefs.notifyPings;
  const notifyAssign = prefs.notifyAssign;
  const notifyTaskDue = prefs.notifyTaskDue;
  const notifyTeam = prefs.notifyTeam;
  const emailDigest = prefs.emailDigest;

  const setNotifyPings = (v: boolean) => updatePrefs({ notifyPings: v });
  const setNotifyAssign = (v: boolean) => updatePrefs({ notifyAssign: v });
  const setNotifyTaskDue = (v: boolean) => updatePrefs({ notifyTaskDue: v });
  const setNotifyTeam = (v: boolean) => updatePrefs({ notifyTeam: v });
  const setEmailDigest = (v: boolean) => updatePrefs({ emailDigest: v });

  // Computed account info
  const memberSince = (session?.user as { createdAt?: string })?.createdAt;

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const savePrefs = () => {
    commitPrefs();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveProfile = async () => {
    setError("");
    setSaving(true);
    try {
      const body: Record<string, string> = { name };
      if (newPw) { body.currentPassword = currentPw; body.newPassword = newPw; }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      await update({ name });
      setSaved(true);
      setCurrentPw("");
      setNewPw("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const accentColor = ACCENT_COLORS.find((a) => a.id === accent) ?? ACCENT_COLORS[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your workspace, account, and preferences</p>
        </header>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="hidden md:flex w-44 shrink-0 flex-col gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-all",
                    activeTab === tab.id
                      ? "bg-blue-500/15 text-blue-300 border border-blue-400/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  {tab.label}
                  {activeTab === tab.id && <span className="ml-auto size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,.8)]" />}
                </button>
              );
            })}
          </div>

          {/* Mobile tab bar */}
          <div className="md:hidden flex gap-1.5 overflow-x-auto no-scrollbar mb-4 w-full">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap", activeTab === tab.id ? "bg-blue-500/20 text-blue-300" : "text-slate-500 bg-white/5")}>
                  <Icon className="size-3" />{tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <>
                <Section title="Profile" icon={User}>
                  {error && <Alert variant="error">{error}</Alert>}
                  <Field label="Display name">
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      className="input-base" placeholder="Your full name" />
                  </Field>
                  <Field label="Email address">
                    <input value={email} disabled className="input-base opacity-40 cursor-not-allowed" />
                    <p className="mt-1 text-[11px] text-slate-600">Email cannot be changed</p>
                  </Field>
                  <Field label="Avatar initials preview">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-xl bg-blue-500/20 text-lg font-bold text-blue-200 border border-blue-400/20">
                        {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                      </div>
                      <p className="text-xs text-slate-500">Auto-generated from your display name</p>
                    </div>
                  </Field>
                </Section>

                <Section title="Change Password" icon={Shield}>
                  <Field label="Current password">
                    <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="••••••••" className="input-base" />
                  </Field>
                  <Field label="New password">
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min 8 characters" className="input-base" />
                  </Field>
                </Section>

                <div className="flex items-center justify-between">
                  <button onClick={() => void signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20">
                    <LogOut className="size-4" /> Sign out
                  </button>
                  <button onClick={() => void saveProfile()} disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,.35)]">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <Save className="size-4" />}
                    {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
                  </button>
                </div>
              </>
            )}

            {/* PERSONALIZATION TAB */}
            {activeTab === "personalization" && (
              <>
                <Section title="Accent Color" icon={Palette}>
                  <p className="text-xs text-slate-500 mb-3">Choose your workspace accent color</p>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setAccent(c.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all",
                          accent === c.id ? "border-white/30 bg-white/8" : "border-white/8 hover:border-white/15 bg-white/[0.02]",
                        )}
                      >
                        <span className={cn("size-8 rounded-lg", c.tw, accent === c.id && c.shadow)} />
                        <span className={cn("text-[10px]", accent === c.id ? "text-white" : "text-slate-600")}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Live preview */}
                  <div className="mt-3 rounded-xl border border-white/8 p-3 bg-white/[0.02]">
                    <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Preview</p>
                    <div className="flex items-center gap-2">
                      <div className={cn("size-2 rounded-full", accentColor.tw, accentColor.shadow)} />
                      <span className="text-xs text-slate-400">Active nav indicator</span>
                    </div>
                    <button className={cn("mt-2 rounded-lg px-4 py-1.5 text-xs font-medium text-white", accentColor.tw)}>
                      Primary button
                    </button>
                  </div>
                </Section>

                <Section title="Display" icon={Eye}>
                  <div className="space-y-3">
                    <ToggleRow
                      label="Compact mode"
                      desc="Reduce padding and spacing throughout the UI"
                      checked={compactMode}
                      onChange={setCompactMode}
                    />
                    <ToggleRow
                      label="Background grid"
                      desc="Show the subtle grid pattern overlay"
                      checked={showGrid}
                      onChange={setShowGrid}
                    />
                    <ToggleRow
                      label="Animations"
                      desc="Enable motion effects and transitions"
                      checked={animationsEnabled}
                      onChange={setAnimationsEnabled}
                    />
                  </div>
                </Section>

                <Section title="Font Size" icon={Sliders}>
                  <div className="grid grid-cols-3 gap-2">
                    {(["sm", "md", "lg"] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border py-3 text-center transition-all",
                          fontSize === size ? "border-blue-400/30 bg-blue-500/10 text-blue-300" : "border-white/8 bg-white/[0.02] text-slate-500 hover:bg-white/5",
                        )}
                      >
                        <span className={cn("font-medium", size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm")}>Aa</span>
                        <span className="text-[10px] capitalize">{size === "sm" ? "Small" : size === "md" ? "Default" : "Large"}</span>
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Keyboard Shortcuts" icon={Keyboard}>
                  <div className="space-y-2">
                    {SHORTCUTS.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{s.label}</span>
                        <div className="flex items-center gap-1">
                          {s.keys.map((k, j) => (
                            <kbd key={j} className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-slate-300">{k}</kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <div className="flex justify-end">
                  <button onClick={savePrefs}
                    className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]">
                    {saved ? <Check className="size-4" /> : <Save className="size-4" />}
                    {saved ? "Saved!" : "Save preferences"}
                  </button>
                </div>
              </>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <>
                <Section title="In-App Notifications" icon={Bell}>
                  <p className="text-xs text-slate-500 mb-3">Control what triggers a notification in your panel</p>
                  <div className="space-y-3">
                    <ToggleRow label="Pings from teammates" desc="When someone sends you a direct ping" checked={notifyPings} onChange={setNotifyPings} />
                    <ToggleRow label="Task assignments" desc="When a task is assigned to you" checked={notifyAssign} onChange={setNotifyAssign} />
                    <ToggleRow label="Tasks due today" desc="Surface tasks that are due within 24 hours" checked={notifyTaskDue} onChange={setNotifyTaskDue} />
                    <ToggleRow label="Team activity" desc="Updates from all team members" checked={notifyTeam} onChange={setNotifyTeam} />
                  </div>
                </Section>

                <Section title="Email Preferences" icon={Moon}>
                  <div className="space-y-3">
                    <ToggleRow label="Daily digest" desc="A summary email of your tasks and activity each morning" checked={emailDigest} onChange={setEmailDigest} />
                  </div>
                  <Alert variant="info">Email digest requires your SMTP settings to be configured in .env</Alert>
                </Section>

                <div className="flex justify-end">
                  <button onClick={savePrefs}
                    className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]">
                    {saved ? <Check className="size-4" /> : <Save className="size-4" />}
                    {saved ? "Saved!" : "Save preferences"}
                  </button>
                </div>
              </>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === "account" && (
              <>
                <Section title="Account Information" icon={User}>
                  <div className="space-y-3">
                    <StatRow label="Email" value={session?.user?.email ?? "—"} />
                    <StatRow label="Display name" value={session?.user?.name ?? "Not set"} />
                    <StatRow
                      label="Account role"
                      value={
                        (session?.user as { role?: string })?.role === "admin"
                          ? "Admin"
                          : (session?.user as { role?: string })?.role === "guest"
                          ? "Guest"
                          : "Member"
                      }
                      badge="Active"
                    />
                    {memberSince && <StatRow label="Member since" value={new Date(memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />}
                    <StatRow label="User ID" value={(session?.user?.id ?? "—").slice(0, 16) + "…"} mono />
                  </div>
                  <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs text-slate-500 space-y-1">
                    <p className="font-medium text-slate-400 mb-2">Account roles</p>
                    <p><span className="text-slate-300 font-medium">Admin</span> — full access: manage members, billing, workspace settings</p>
                    <p><span className="text-slate-300 font-medium">Member</span> — standard access: tasks, projects, chat, calls, notes</p>
                    <p><span className="text-slate-300 font-medium">Guest</span> — read-only view of assigned projects and tasks only</p>
                  </div>
                </Section>

                <Section title="Data & Privacy" icon={Shield}>
                  <div className="space-y-2 text-xs text-slate-500">
                    <p>Data encrypted at rest in MongoDB Atlas</p>
                    <p>Video calls use WebRTC with DTLS-SRTP</p>
                    <p>Passwords hashed with bcrypt (12 rounds)</p>
                    <p>Sessions signed with NextAuth.js JWT</p>
                    <p>Rate limiting enforced on all API routes</p>
                  </div>
                </Section>

                <Section title="Danger Zone" icon={Shield}>
                  <Alert variant="error">
                    Deleting your account is permanent and cannot be undone. Contact your workspace admin.
                  </Alert>
                  <button className="mt-3 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20">
                    <LogOut className="size-4" />
                    Delete account
                  </button>
                </Section>
              </>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <>
                <Section title="About Tempo" icon={Hash}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="grid size-14 place-items-center rounded-2xl border border-blue-400/30 bg-blue-500/15 shadow-[0_0_30px_rgba(59,130,246,.2)]">
                      <Hash className="size-7 text-blue-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">Tempo</p>
                      <p className="text-xs text-slate-500">Command Center — Version 1.1.0</p>
                      <p className="text-[10px] text-slate-700 mt-0.5">Internal team workspace</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Code, label: "Framework", value: "Next.js 15" },
                      { icon: Shield, label: "Auth", value: "NextAuth.js" },
                      { icon: Zap, label: "Database", value: "MongoDB Atlas" },
                      { icon: Clock, label: "Real-time", value: "Polling + WebRTC" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="size-3 text-slate-600" />
                            <span className="text-[10px] text-slate-600 uppercase tracking-wider">{item.label}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-300">{item.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section title="What's New in v1.1" icon={Zap}>
                  <div className="space-y-2">
                    {[
                      "Ping teammates with instant notifications",
                      "Live notification center with real-time polling",
                      "Personalization — accent colors, font size, compact mode",
                      "Command Center status bar with live metrics",
                      "Online team presence in the sidebar",
                      "Account info and privacy dashboard",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-0.5 size-1 shrink-0 rounded-full bg-slate-600 mt-1.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Support" icon={Info}>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>For issues, reach out to your team admin or check the README in the project repository.</p>
                    <p className="mt-2">Keyboard shortcuts, API docs, and deployment notes are in the project&apos;s <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">README.md</code> and <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">DEPLOYMENT.md</code> files.</p>
                  </div>
                </Section>
              </>
            )}

            {/* ADMIN TAB — only rendered for admins */}
            {activeTab === "admin" && isAdmin && (
              <>
                <Section title="Admin Panel" icon={Shield}>
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      You have admin access to this workspace. Use the Admin panel to manage team members, change roles, and deactivate accounts.
                    </p>
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 hover:bg-blue-500/15 hover:border-blue-400/30 transition-colors"
                    >
                      <Shield className="size-4 shrink-0" />
                      <span className="flex-1 font-medium">Open Team Management</span>
                      <ExternalLink className="size-3.5 opacity-60" />
                    </Link>
                  </div>
                </Section>

                <Section title="What you can do" icon={Shield}>
                  <div className="space-y-2">
                    {[
                      "View all team members with online status and join date",
                      "Promote members to Admin or demote to Guest",
                      "Deactivate accounts (sets role to Guest)",
                      "All changes take effect immediately",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-blue-400/60" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---- Sub-components ----

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-slate-500" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Alert({ variant, children }: { variant: "error" | "info"; children: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-xl border px-3 py-2 text-xs",
      variant === "error" ? "border-red-400/20 bg-red-500/10 text-red-300" : "border-blue-400/20 bg-blue-500/10 text-blue-300",
    )}>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-all",
          checked ? "bg-blue-500 border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,.4)]" : "bg-white/8 border-white/10",
        )}
      >
        <span className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all",
          checked ? "left-4" : "left-0.5",
        )} />
      </button>
    </div>
  );
}

function StatRow({ label, value, badge, mono }: { label: string; value: string; badge?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs text-slate-300", mono && "font-mono")}>{value}</span>
        {badge && <span className="rounded-full bg-green-500/15 border border-green-400/20 px-1.5 py-0.5 text-[10px] text-green-400">{badge}</span>}
      </div>
    </div>
  );
}

// Add to globals via style tag injection
declare module "react" {
  interface HTMLAttributes<_T> {
    class?: string;
  }
}

// Extend input styles
const _inputStyles = `
  .input-base {
    width: 100%;
    border-radius: 0.75rem;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    outline: none;
    color: white;
  }
  .input-base:focus {
    border-color: rgba(59,130,246,0.5);
  }
`;

// Inject once
if (typeof document !== "undefined") {
  if (!document.getElementById("tempo-input-styles")) {
    const style = document.createElement("style");
    style.id = "tempo-input-styles";
    style.textContent = _inputStyles;
    document.head.appendChild(style);
  }
}
