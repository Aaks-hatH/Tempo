"use client";

/**
 * VideoCall — enhanced secure WebRTC video call component
 * Fixes: mirror cam, reactive srcObject, PiP, store integration
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  FlipHorizontal2,
  Hand,
  Loader2,
  Lock,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  Phone,
  PhoneOff,
  PictureInPicture2,
  Send,
  Shield,
  ShieldCheck,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTempoStore } from "@/store/use-tempo-store";

interface SignalMessage {
  _id: string;
  fromPeer: string;
  toPeer: string | null;
  type: "offer" | "answer" | "ice-candidate";
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  createdAt: string;
}

type CallPhase = "pin-entry" | "connecting" | "call" | "ended" | "error";

interface ChatMsg {
  id: string;
  text: string;
  mine: boolean;
  at: Date;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

async function deriveKey(pin: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(roomId), iterations: 200_000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function makeEncryptTransform(key: CryptoKey): TransformStream {
  return new TransformStream({
    async transform(frame, controller) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      try {
        const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, frame.data);
        const out = new Uint8Array(12 + enc.byteLength);
        out.set(iv, 0);
        out.set(new Uint8Array(enc), 12);
        frame.data = out.buffer;
        controller.enqueue(frame);
      } catch { /* drop */ }
    },
  });
}

function makeDecryptTransform(key: CryptoKey): TransformStream {
  return new TransformStream({
    async transform(frame, controller) {
      const d = new Uint8Array(frame.data);
      if (d.length < 13) return;
      try {
        const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: d.slice(0, 12) }, key, d.slice(12));
        frame.data = dec;
        controller.enqueue(frame);
      } catch { /* drop */ }
    },
  });
}

function encryptSender(sender: RTCRtpSender, key: CryptoKey) {
  if (!("createEncodedStreams" in sender)) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { readable, writable } = (sender as any).createEncodedStreams();
    readable.pipeThrough(makeEncryptTransform(key)).pipeTo(writable);
  } catch { /* not available */ }
}

function decryptReceiver(receiver: RTCRtpReceiver, key: CryptoKey) {
  if (!("createEncodedStreams" in receiver)) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { readable, writable } = (receiver as any).createEncodedStreams();
    readable.pipeThrough(makeDecryptTransform(key)).pipeTo(writable);
  } catch { /* not available */ }
}

const MY_PEER_ID = crypto.randomUUID();

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function useAudioLevel(enabled: boolean, stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled || !stream) { setLevel(0); return; }
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      ctxRef.current = ctx;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        setLevel(Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length / 128) * 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* not available */ }
    return () => {
      cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [enabled, stream]);

  return level;
}

function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      lockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request("screen");
    } catch { /* denied */ }
  }, []);
  const release = useCallback(async () => {
    try { await lockRef.current?.release(); } catch { /* ok */ }
    lockRef.current = null;
  }, []);
  useEffect(() => {
    if (!active) { void release(); return; }
    void acquire();
    const onVisible = () => { if (document.visibilityState === "visible") void acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); void release(); };
  }, [active, acquire, release]);
}

export function VideoCall({ roomId }: { roomId: string }) {
  const router = useRouter();
  const { setActiveCallRoomId } = useTempoStore();

  const [phase, setPhase] = useState<CallPhase>("pin-entry");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [blurBg, setBlurBg] = useState(false);
  const [mirrorLocal, setMirrorLocal] = useState(true);
  const [e2eActive, setE2eActive] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [waitingSecs, setWaitingSecs] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [remoteHand, setRemoteHand] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState("");
  const [selMic, setSelMic] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [autoPiPEnabled, setAutoPiPEnabled] = useState(true);

  // Reactive stream state — drives srcObject via useEffect (more reliable than imperative)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const pinRef = useRef("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSignalTime = useRef(new Date(Date.now() - 5000).toISOString());
  const dcRef = useRef<RTCDataChannel | null>(null);

  const localAudioLevel = useAudioLevel(audioEnabled, localStream);
  useWakeLock(phase === "call");

  // ── Reactive srcObject — fires after React commits DOM nodes ──────────────
  useEffect(() => {
    if (previewRef.current && previewStream) previewRef.current.srcObject = previewStream;
  }, [previewStream, phase]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, phase]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, phase]);

  // Background tab handling
  useEffect(() => {
    if (phase !== "call") return;
    const handle = async () => {
      const hidden = document.visibilityState === "hidden";
      setIsBackgrounded(hidden);
      if (hidden && autoPiPEnabled && document.pictureInPictureEnabled) {
        try {
          const target = (remoteVideoRef.current && remoteStream) ? remoteVideoRef.current : localVideoRef.current;
          if (target && !document.pictureInPictureElement && target.readyState >= 2)
            await target.requestPictureInPicture();
        } catch { /* ok */ }
      }
      if (!hidden && document.pictureInPictureElement) {
        try { await document.exitPictureInPicture(); } catch { /* ok */ }
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [phase, autoPiPEnabled, remoteStream]);

  useEffect(() => {
    if (phase !== "call") return;
    const handle = () => {
      if (document.visibilityState === "visible") {
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = audioEnabled; });
        localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = videoEnabled; });
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [phase, audioEnabled, videoEnabled]);

  useEffect(() => {
    const pc = new RTCPeerConnection();
    const s = pc.addTransceiver("audio").sender;
    setE2eActive("createEncodedStreams" in s);
    pc.close();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      const cams = devs.filter((d) => d.kind === "videoinput");
      const ms = devs.filter((d) => d.kind === "audioinput");
      setCameras(cams); setMics(ms);
      if (cams[0]) setSelCam(cams[0].deviceId);
      if (ms[0]) setSelMic(ms[0].deviceId);
    }).catch(() => {});
  }, []);

  // Pre-call preview
  useEffect(() => {
    if (phase !== "pin-entry") return;
    const go = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selCam ? { deviceId: { exact: selCam } } : true,
          audio: false,
        });
        previewStreamRef.current = stream;
        setPreviewStream(stream);
      } catch { /* denied */ }
    };
    void go();
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setPreviewStream(null);
    };
  }, [phase, selCam]);

  useEffect(() => {
    if (phase === "call" && !remoteConnected) {
      const id = setInterval(() => setWaitingSecs((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
  }, [phase, remoteConnected]);

  useEffect(() => {
    if (phase === "call" && remoteConnected) {
      const id = setInterval(() => setCallDuration((s) => s + 1), 1000);
      return () => clearInterval(id);
    }
  }, [phase, remoteConnected]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const hookDC = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc;
    dc.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data as string) as { type: string; text?: string; hand?: boolean };
        if (msg.type === "chat" && msg.text) {
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), text: msg.text!, mine: false, at: new Date() }]);
          setChatOpen((open) => { if (!open) setUnread((n) => n + 1); return open; });
        }
        if (msg.type === "hand") setRemoteHand(msg.hand ?? false);
      } catch { /* ignore */ }
    };
  }, []);

  const sendSignal = useCallback(
    async (type: "offer" | "answer" | "ice-candidate", data: unknown, toPeer?: string) => {
      await fetch(`/api/call/signal/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinRef.current, peerId: MY_PEER_ID, toPeer, type, data }),
      });
    },
    [roomId],
  );

  const handleSignal = useCallback(async (sig: SignalMessage) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (sig.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.data as RTCSessionDescriptionInit));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      await sendSignal("answer", ans, sig.fromPeer);
    } else if (sig.type === "answer") {
      if (pc.signalingState === "have-local-offer")
        await pc.setRemoteDescription(new RTCSessionDescription(sig.data as RTCSessionDescriptionInit));
    } else if (sig.type === "ice-candidate") {
      try { await pc.addIceCandidate(new RTCIceCandidate(sig.data as RTCIceCandidateInit)); } catch { /* ok */ }
    }
  }, [sendSignal]);

  const pollSignals = useCallback(async () => {
    const url = `/api/call/signal/${roomId}?pin=${encodeURIComponent(pinRef.current)}&peerId=${MY_PEER_ID}&since=${encodeURIComponent(lastSignalTime.current)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const { signals, serverTime } = await res.json() as { signals: SignalMessage[]; serverTime: string };
      lastSignalTime.current = serverTime;
      for (const s of signals) await handleSignal(s);
    } catch { /* network */ }
  }, [roomId, handleSignal]);

  const cleanup = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    dcRef.current?.close(); dcRef.current = null;
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop()); localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop()); screenStreamRef.current = null;
    keyRef.current = null;
    setIsSharingScreen(false);
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCallRoomId(null);
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
  }, [setActiveCallRoomId]);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      encodedInsertableStreams: true,
    } as RTCConfiguration & { encodedInsertableStreams?: boolean });
    const dc = pc.createDataChannel("tempo", { ordered: true });
    hookDC(dc);
    pc.ondatachannel = (e) => hookDC(e.channel);
    pc.onicecandidate = ({ candidate }) => { if (candidate) void sendSignal("ice-candidate", candidate.toJSON()); };
    pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        setRemoteStream(streams[0]);
        setRemoteConnected(true);
        setPhase("call");
      }
      if (keyRef.current) pc.getReceivers().forEach((r) => decryptReceiver(r, keyRef.current!));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") { setPhase("ended"); cleanup(); }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, cleanup, hookDC]);

  const joinCall = useCallback(async () => {
    if (!/^\d{6}$/.test(pinInput)) { setPinError("PIN must be exactly 6 digits."); return; }
    setPhase("connecting");
    pinRef.current = pinInput;
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);

    let key: CryptoKey;
    try { key = await deriveKey(pinInput, roomId); keyRef.current = key; }
    catch { setPhase("error"); setErrorMsg("Failed to derive encryption key."); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: selCam ? { deviceId: { exact: selCam } } : true,
        audio: selMic ? { deviceId: { exact: selMic } } : true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream); // reactive — useEffect will set srcObject after render
    } catch {
      setPhase("error"); setErrorMsg("Could not access camera or microphone."); return;
    }

    const verifyRes = await fetch(`/api/call/signal/${roomId}?pin=${encodeURIComponent(pinInput)}&peerId=${MY_PEER_ID}`);
    if (!verifyRes.ok) {
      setPinError("Incorrect PIN or room not found."); setPhase("pin-entry");
      stream.getTracks().forEach((t) => t.stop()); return;
    }

    const pc = createPC();
    stream.getTracks().forEach((t) => { const s = pc.addTrack(t, stream); encryptSender(s, key); });

    const { signals } = await verifyRes.json() as { signals: SignalMessage[] };
    if (!signals.some((s) => s.type === "offer")) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer);
    }

    pollingRef.current = setInterval(pollSignals, 1500);
    await pollSignals();
    setPhase("call");
    setActiveCallRoomId(roomId); // tell AppShell we're live
  }, [pinInput, roomId, selCam, selMic, createPC, sendSignal, pollSignals, setActiveCallRoomId]);

  function toggleAudio() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setAudioEnabled((v) => !v);
  }
  function toggleVideo() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setVideoEnabled((v) => !v);
  }

  async function toggleScreen() {
    const pc = pcRef.current;
    const sender = pc?.getSenders().find((s) => s.track?.kind === "video");
    if (isSharingScreen) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && sender) await sender.replaceTrack(cam);
      if (localStreamRef.current) setLocalStream(localStreamRef.current);
      setIsSharingScreen(false);
      return;
    }
    try {
      const scr = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = scr;
      const track = scr.getVideoTracks()[0];
      if (sender && keyRef.current) { await sender.replaceTrack(track); encryptSender(sender, keyRef.current); }
      const displayStream = new MediaStream([track, ...(localStreamRef.current?.getAudioTracks() ?? [])]);
      setLocalStream(displayStream);
      setIsSharingScreen(true);
      track.onended = async () => {
        screenStreamRef.current = null;
        const cam = localStreamRef.current?.getVideoTracks()[0];
        if (cam && sender) await sender.replaceTrack(cam);
        if (localStreamRef.current) setLocalStream(localStreamRef.current);
        setIsSharingScreen(false);
      };
    } catch { /* cancelled */ }
  }

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    try { dcRef.current?.send(JSON.stringify({ type: "hand", hand: next })); } catch { /* ok */ }
  }

  async function togglePiP() {
    if (!document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
      // Prefer remote, fall back to local
      const target = (remoteVideoRef.current && remoteStream && remoteVideoRef.current.readyState >= 2)
        ? remoteVideoRef.current
        : localVideoRef.current;
      if (target && target.readyState >= 2) await target.requestPictureInPicture();
    } catch { /* not supported */ }
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {}); setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {}); setFullscreen(false);
    }
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((p) => [...p, { id: crypto.randomUUID(), text, mine: true, at: new Date() }]);
    try { dcRef.current?.send(JSON.stringify({ type: "chat", text })); } catch { /* ok */ }
    setChatInput("");
  }

  function hangUp() { cleanup(); setPhase("ended"); }
  useEffect(() => () => cleanup(), [cleanup]);

  // ── Render phases ─────────────────────────────────────────────────────────

  if (phase === "pin-entry") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-8 flex-wrap">
        <div className="shrink-0 w-80 space-y-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60">
            <video
              ref={previewRef}
              autoPlay playsInline muted
              className="h-full w-full object-cover"
              style={{ transform: mirrorLocal ? "scaleX(-1)" : "none" }}
            />
            {!previewStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-600 pointer-events-none">
                <Camera className="size-8 opacity-30" />
                <p className="text-xs opacity-30">Camera preview</p>
              </div>
            )}
            <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 text-[11px] text-slate-400 backdrop-blur-sm">
              Preview · not transmitted
            </span>
            <button
              onClick={() => setMirrorLocal(v => !v)}
              title={mirrorLocal ? "Disable mirror" : "Enable mirror"}
              className={`absolute top-2 right-2 rounded-lg p-1.5 backdrop-blur-sm transition-colors ${mirrorLocal ? "bg-blue-500/40 text-blue-200 border border-blue-400/40" : "bg-black/50 text-slate-400 border border-white/10"}`}
            >
              <FlipHorizontal2 className="size-3.5" />
            </button>
          </div>

          {cameras.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] text-slate-600 uppercase tracking-widest">Camera</label>
              <div className="relative">
                <select value={selCam} onChange={(e) => setSelCam(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 outline-none appearance-none cursor-pointer">
                  {cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0, 6)}`}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-500" />
              </div>
            </div>
          )}

          {mics.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] text-slate-600 uppercase tracking-widest">Microphone</label>
              <div className="relative">
                <select value={selMic} onChange={(e) => setSelMic(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 outline-none appearance-none cursor-pointer">
                  {mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${m.deviceId.slice(0, 6)}`}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-500" />
              </div>
            </div>
          )}
        </div>

        <div className="glass w-full max-w-sm rounded-2xl p-7 space-y-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-green-400/25 bg-green-500/10">
              <Lock className="size-4 text-green-300" />
            </span>
            <div>
              <p className="font-medium text-sm">Enter room PIN</p>
              <p className="text-xs text-slate-500 font-mono">{roomId.slice(0, 8)}…</p>
            </div>
          </div>
          {pinError && <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{pinError}</p>}
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && void joinCall()}
            placeholder="6-digit PIN"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xl font-mono tracking-[0.5em] outline-none focus:border-green-400/40"
            maxLength={6} type="password" inputMode="numeric" autoFocus
          />
          <button onClick={() => void joinCall()} disabled={pinInput.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-50">
            <Phone className="size-4" /> Join call
          </button>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div onClick={() => setAutoPiPEnabled((v) => !v)}
              className={`relative h-4 w-7 rounded-full transition-colors ${autoPiPEnabled ? "bg-blue-500" : "bg-white/10"}`}>
              <span className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform ${autoPiPEnabled ? "translate-x-3" : "translate-x-0.5"}`} />
            </div>
            <span className="text-xs text-slate-400">Auto picture-in-picture when switching tabs</span>
          </label>
          <p className="text-xs text-slate-600 text-center leading-5">PIN derives your AES-256-GCM key locally — never sent in plaintext.</p>
        </div>
      </div>
    );
  }

  if (phase === "connecting") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-white/8 bg-black">
          <video ref={localVideoRef} autoPlay playsInline muted
            className="h-full w-full object-cover opacity-70"
            style={{ transform: mirrorLocal ? "scaleX(-1)" : "none" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-green-400" />
            <p className="text-sm text-white font-medium">Setting up encrypted connection…</p>
            <p className="text-xs text-slate-400 font-mono">Deriving keys · Gathering ICE candidates</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="grid size-16 place-items-center rounded-full border border-white/8 bg-white/4"><PhoneOff className="size-7 text-slate-500" /></div>
        <p className="text-sm text-slate-400">Call ended.</p>
        {callDuration > 0 && <p className="text-xs text-slate-600 font-mono">Duration: {fmtDuration(callDuration)}</p>}
        <button onClick={() => router.push("/call")} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/8">Back to rooms</button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="size-8 text-red-400" />
        <p className="text-sm text-red-300">{errorMsg}</p>
        <button onClick={() => router.push("/call")} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/8">Back to rooms</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-5xl space-y-3">
      {isBackgrounded && (
        <div className="flex items-center justify-between rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(34,197,94,.8)]" />
            <p className="text-xs text-blue-200 font-medium">Call running in background</p>
          </div>
          <button onClick={() => void togglePiP()} className="text-[11px] text-blue-400 hover:text-blue-300 border border-blue-400/30 rounded-lg px-2 py-1">Open PiP</button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-green-400/15 bg-green-500/5 px-3 py-1.5">
          {e2eActive
            ? <><ShieldCheck className="size-3.5 text-green-400 shrink-0" /><p className="text-[11px] text-green-300">DTLS-SRTP + AES-256-GCM</p></>
            : <><Shield className="size-3.5 text-yellow-400 shrink-0" /><p className="text-[11px] text-yellow-300">DTLS-SRTP · Use Chrome/Edge for full E2E</p></>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {remoteConnected && <span className="font-mono text-xs text-slate-400 tabular-nums">{fmtDuration(callDuration)}</span>}
          {isSharingScreen && <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30 px-2 py-1 text-xs text-blue-300"><Monitor className="size-3" /> Sharing screen</span>}
          {(handRaised || remoteHand) && <span className="flex items-center gap-1 rounded-lg bg-yellow-500/20 border border-yellow-400/30 px-2 py-1 text-xs text-yellow-300">✋ {handRaised && remoteHand ? "Both hands" : handRaised ? "Your hand" : "Remote hand"} raised</span>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className={`grid gap-3 ${remoteConnected ? "md:grid-cols-2" : ""}`}>
            {/* Remote video */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              {!remoteConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
                  <div className="grid size-16 place-items-center rounded-full border border-white/8 bg-white/4"><Video className="size-7 text-slate-600" /></div>
                  <p className="text-sm font-medium text-slate-400">Waiting for peer…</p>
                  <p className="text-xs text-slate-600 font-mono">{Math.floor(waitingSecs / 60)}:{String(waitingSecs % 60).padStart(2, "0")} elapsed</p>
                  <div className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-slate-600 font-mono">Live · Share the room ID</span></div>
                </div>
              )}
              {remoteConnected && <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs text-slate-300 backdrop-blur-sm">Remote {remoteHand ? "✋" : ""}</span>}
            </div>

            {/* Local video */}
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted
                className="h-full w-full object-cover transition-all duration-300"
                style={{ filter: blurBg ? "blur(10px) saturate(0.6)" : "none", transform: mirrorLocal ? "scaleX(-1)" : "none" }} />
              <div className="absolute top-2 right-2 flex items-end gap-0.5">
                {[3, 5, 7, 9, 11].map((h, i) => (
                  <div key={i} className="w-1 rounded-full transition-all duration-75"
                    style={{ height: `${h}px`, backgroundColor: localAudioLevel > (i + 1) * 16 ? "#22c55e" : "rgba(255,255,255,0.1)" }} />
                ))}
              </div>
              <span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs text-slate-300 backdrop-blur-sm">You {handRaised ? "✋" : ""}{isSharingScreen ? " 🖥️" : ""}</span>
              {!videoEnabled && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><VideoOff className="size-8 text-slate-500" /></div>}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 flex-wrap py-1">
            <CtrlBtn active={audioEnabled} danger={!audioEnabled} label={audioEnabled ? "Mute" : "Unmuted"} onClick={toggleAudio}>
              {audioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </CtrlBtn>
            <CtrlBtn active={videoEnabled} danger={!videoEnabled} label={videoEnabled ? "Camera" : "No cam"} onClick={toggleVideo}>
              {videoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </CtrlBtn>
            <CtrlBtn active={!isSharingScreen} highlight={isSharingScreen} label={isSharingScreen ? "Stop share" : "Share"} onClick={() => void toggleScreen()}>
              {isSharingScreen ? <MonitorOff className="size-5" /> : <Monitor className="size-5" />}
            </CtrlBtn>
            <CtrlBtn active={!handRaised} warn={handRaised} label={handRaised ? "Lower" : "Hand"} onClick={toggleHand}>
              <Hand className="size-5" />
            </CtrlBtn>
            <button onClick={() => { setChatOpen((v) => !v); setUnread(0); }}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-xs transition-colors ${chatOpen ? "border-purple-400/40 bg-purple-500/20 text-purple-300" : "border-white/10 bg-white/8 hover:bg-white/12 text-slate-300"}`}>
              <MessageSquare className="size-5" /><span>Chat</span>
              {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center px-1 font-bold">{unread}</span>}
            </button>
            <CtrlBtn active={!blurBg} highlight={blurBg} label={blurBg ? "Unblur" : "Blur bg"} onClick={() => setBlurBg((v) => !v)}>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M3 12h1m16 0h1M12 3v1m0 16v1m-7-3.5 1 1M17 7l1-1m-14 1 1 1M17 17l1 1" strokeLinecap="round" /></svg>
            </CtrlBtn>
            {/* Mirror cam toggle */}
            <CtrlBtn active={!mirrorLocal} highlight={mirrorLocal} label={mirrorLocal ? "Mirrored" : "Mirror"} onClick={() => setMirrorLocal((v) => !v)}>
              <FlipHorizontal2 className="size-5" />
            </CtrlBtn>
            <CtrlBtn active highlight={!!document.pictureInPictureElement} label="PiP" onClick={() => void togglePiP()}>
              <PictureInPicture2 className="size-5" />
            </CtrlBtn>
            <CtrlBtn active label={fullscreen ? "Exit" : "Full"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </CtrlBtn>
            <button onClick={() => setAutoPiPEnabled((v) => !v)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-xs transition-colors ${autoPiPEnabled ? "border-blue-400/40 bg-blue-500/20 text-blue-300" : "border-white/10 bg-white/8 text-slate-400 hover:bg-white/12"}`}
              title="Automatically enter PiP when you switch tabs">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="14" rx="2" /><rect x="13" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" /></svg>
              <span>Auto PiP</span>
            </button>
            <button onClick={hangUp} className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border border-red-400/30 bg-red-500/20 text-red-300 hover:bg-red-500/35 text-xs transition-colors">
              <PhoneOff className="size-5" /><span>End call</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-600 font-mono">
            Room: <span className="select-all text-slate-500">{roomId}</span>
            <button onClick={() => navigator.clipboard.writeText(roomId).catch(() => {})}
              className="ml-2 text-slate-600 hover:text-slate-400 text-[10px] border border-white/8 rounded px-1.5 py-0.5 transition-colors">copy</button>
          </p>
        </div>

        {chatOpen && (
          <div className="w-68 flex flex-col glass rounded-2xl overflow-hidden shrink-0" style={{ width: "17rem" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-sm font-medium">In-call chat</span>
              <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "400px" }}>
              {messages.length === 0
                ? <p className="text-xs text-slate-600 text-center py-6">No messages yet.<br />Messages are ephemeral — not stored.</p>
                : messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.mine ? "bg-blue-500/30 text-white rounded-br-sm" : "bg-white/8 text-slate-300 rounded-bl-sm"}`}>
                      <p className="break-words">{msg.text}</p>
                      <p className="text-[9px] opacity-40 mt-0.5 text-right">{msg.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2.5 border-t border-white/8 flex gap-2">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none focus:border-blue-400/40" />
              <button onClick={sendChat} disabled={!chatInput.trim()}
                className="grid size-8 place-items-center rounded-xl bg-blue-500/30 border border-blue-400/30 text-blue-300 hover:bg-blue-500/50 disabled:opacity-30 transition-colors">
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({ children, label, onClick, active, danger, highlight, warn }: {
  children: React.ReactNode; label: string; onClick: () => void;
  active?: boolean; danger?: boolean; highlight?: boolean; warn?: boolean;
}) {
  const cls = danger ? "border-red-400/40 bg-red-500/20 text-red-300 hover:bg-red-500/30"
    : highlight ? "border-blue-400/40 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
    : warn ? "border-yellow-400/40 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30"
    : active ? "border-white/10 bg-white/8 hover:bg-white/12 text-slate-300"
    : "border-white/10 bg-white/8 hover:bg-white/12 text-slate-400";
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-xs transition-colors ${cls}`}>
      {children}<span>{label}</span>
    </button>
  );
}
