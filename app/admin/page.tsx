"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  Shield,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

interface AdminUser {
  _id: string;
  name: string | null;
  email: string;
  role: "admin" | "member" | "guest";
  isOnline: boolean;
  joinedAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:  { label: "Admin",  color: "text-blue-300 bg-blue-500/15 border-blue-400/20" },
  member: { label: "Member", color: "text-slate-300 bg-white/5 border-white/10" },
  guest:  { label: "Guest",  color: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_LABELS[role] ?? ROLE_LABELS.member;
  return (
    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase", cfg.color)}>
      {cfg.label}
    </span>
  );
}

function RoleDropdown({
  userId,
  currentRole,
  onChanged,
}: {
  userId: string;
  currentRole: string;
  onChanged: (userId: string, newRole: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const choose = async (role: string) => {
    setOpen(false);
    if (role === currentRole) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "setRole", role }),
      });
      if (res.ok) onChanged(userId, role);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : <Shield className="size-3" />}
        Change role
        <ChevronDown className="size-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1.5 min-w-32 rounded-xl border border-white/10 bg-black/95 p-1 shadow-2xl backdrop-blur-xl">
            {(["admin", "member", "guest"] as const).map((r) => (
              <button
                key={r}
                onClick={() => void choose(r)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
                  r === currentRole
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/8 hover:text-white",
                )}
              >
                <RoleBadge role={r} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DeactivateButton({
  userId,
  currentRole,
  onChanged,
}: {
  userId: string;
  currentRole: string;
  onChanged: (userId: string, newRole: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleClick = async () => {
    if (currentRole === "guest") return; // already deactivated
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "deactivate" }),
      });
      if (res.ok) onChanged(userId, "guest");
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      disabled={saving || currentRole === "guest"}
      title={currentRole === "guest" ? "Already deactivated (Guest)" : "Deactivate user"}
      className="flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? <Loader2 className="size-3 animate-spin" /> : <UserMinus className="size-3" />}
      Deactivate
    </button>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = session?.user?.role === "admin";

  // Redirect non-admins on the client side (middleware also guards /admin)
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.replace("/login"); return; }
    if (!isAdmin) { router.replace("/dashboard"); }
  }, [session, status, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load users");
        return r.json();
      })
      .then(({ users: u }: { users: AdminUser[] }) => setUsers(u))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleChanged = (userId: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u._id === userId ? { ...u, role: newRole as AdminUser["role"] } : u,
      ),
    );
  };

  const counts = {
    total: users.length,
    online: users.filter((u) => u.isOnline).length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  if (!isAdmin) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="grid size-8 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15">
              <Shield className="size-4 text-blue-300" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10.5">Team management and workspace controls</p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total members", value: counts.total, icon: Users },
            { label: "Online now", value: counts.online, icon: UserCheck },
            { label: "Admins", value: counts.admins, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-black/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="size-4 text-slate-500" />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <p className="text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {/* User table */}
        <section className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
            <h2 className="text-sm font-semibold text-slate-200">Team members</h2>
            <span className="text-xs text-slate-600">{counts.total} total</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-5 animate-spin text-slate-500" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-400">{error}</div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((user) => {
                const initials = (user.name ?? user.email).slice(0, 2).toUpperCase();
                const displayName = user.name ?? user.email.split("@")[0];
                const isSelf = user._id === session?.user?.id;

                return (
                  <div
                    key={user._id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Avatar + online dot */}
                    <div className="relative shrink-0">
                      <div className="grid size-9 place-items-center rounded-xl bg-slate-800 text-xs font-semibold text-slate-300">
                        {initials}
                      </div>
                      {user.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,.8)] ring-2 ring-black" />
                      )}
                    </div>

                    {/* Name / email */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {displayName}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] text-slate-600">(you)</span>
                          )}
                        </p>
                        <RoleBadge role={user.role} />
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                    </div>

                    {/* Join date */}
                    <div className="hidden shrink-0 text-right md:block">
                      <p className="text-[10px] text-slate-600">Joined</p>
                      <p className="text-xs text-slate-400">
                        {new Date(user.joinedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Actions — disabled for self to prevent lockout */}
                    {!isSelf && (
                      <div className="flex items-center gap-2 shrink-0">
                        <RoleDropdown
                          userId={user._id}
                          currentRole={user.role}
                          onChanged={handleChanged}
                        />
                        <DeactivateButton
                          userId={user._id}
                          currentRole={user.role}
                          onChanged={handleChanged}
                        />
                      </div>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-slate-700 shrink-0">Can&apos;t edit own role</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Info box */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-slate-600 space-y-1.5">
          <p className="text-slate-400 font-medium mb-1">Role permissions</p>
          <p><span className="text-slate-300 font-medium">Admin</span> — full access: manage members, workspace settings, all data</p>
          <p><span className="text-slate-300 font-medium">Member</span> — standard access: tasks, projects, chat, calls, notes</p>
          <p><span className="text-slate-300 font-medium">Guest</span> — read-only view of assigned projects and tasks only</p>
          <p className="mt-2 text-slate-700">Deactivating a user sets their role to Guest. You cannot edit your own role to prevent accidental lockout.</p>
        </div>
      </div>
    </AppShell>
  );
}
