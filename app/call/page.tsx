"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

interface Room {
  _id: string;
  roomId: string;
  name: string;
  createdAt: string;
  expiresAt: string;
}

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (roomId: string) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    if (!/^\d{6}$/.test(pin)) { setError("PIN must be exactly 6 digits"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/call/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      if (!res.ok) throw new Error("Failed");
      const { roomId } = await res.json();
      onCreated(roomId);
    } catch {
      setError("Failed to create room");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">New Call Room</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Room name (e.g. Daily Standup)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50" />
        <div>
          <label className="mb-1.5 block text-xs text-slate-500 flex items-center gap-1">
            <Lock className="size-3" /> 6-digit PIN (share with teammates)
          </label>
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456" inputMode="numeric" maxLength={6}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-blue-400/50" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
          <button onClick={() => void submit()} disabled={submitting}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50">
            {submitting ? "Creating..." : "Create room"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const fetchRooms = useCallback(async () => {
    const res = await fetch("/api/call/rooms");
    if (res.ok) {
      const { rooms: r } = await res.json();
      setRooms(r);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchRooms(); }, [fetchRooms]);

  const handleCreated = (roomId: string) => {
    router.push(`/call/${roomId}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Video Calls</h1>
            <p className="text-sm text-slate-500">E2E encrypted · WebRTC · Up to 4 participants</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]">
            <Plus className="size-4" /> New room
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 gap-3">
            <Video className="size-10 text-slate-700" />
            <p className="text-slate-500">No active call rooms</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/30">
              <Plus className="size-4" /> Create the first room
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => {
              const expiresIn = new Date(room.expiresAt).getTime() - Date.now();
              const hoursLeft = Math.round(expiresIn / 3600000);
              return (
                <div key={room._id}
                  className="glass flex items-center justify-between rounded-2xl p-4 hover:border-white/25 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 border border-blue-400/20">
                      <Video className="size-5 text-blue-300" />
                    </span>
                    <div>
                      <p className="font-medium">{room.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{room.roomId.slice(0, 12)}… · expires in {hoursLeft}h</p>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/call/${room.roomId}`)}
                    className="flex items-center gap-2 rounded-xl bg-green-500/15 border border-green-400/25 px-4 py-2 text-sm text-green-300 hover:bg-green-500/25 font-medium">
                    <Video className="size-4" /> Join
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass rounded-2xl p-4 text-xs text-slate-500 space-y-1">
          <p className="text-slate-400 font-medium">Security</p>
          <p>All calls are protected by DTLS-SRTP (WebRTC standard). Chrome/Edge also enables per-frame AES-256-GCM Insertable Streams encryption derived from your room PIN.</p>
          <p>The PIN is never sent to the server in plaintext — only a bcrypt hash is stored.</p>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </AppShell>
  );
}
