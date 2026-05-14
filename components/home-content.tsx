"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const features = [
  {
    icon: "✦",
    cmd: "tasks --view kanban",
    title: "Task Management",
    desc: "We built full list and Kanban views from scratch — priorities, tags, due times, and drag-and-drop. Nothing outsourced.",
    accent: "#00ff88",
  },
  {
    icon: "◈",
    cmd: "chat --channel general",
    title: "Team Chat",
    desc: "Our own real-time messaging system. Channel-based, no third-party chat SDK, polling-free updates baked into the stack.",
    accent: "#00aaff",
  },
  {
    icon: "◉",
    cmd: "calendar --week",
    title: "Smart Calendar",
    desc: "Week and month views, colour-coded events, click-to-create. We wrote every line of the calendar logic ourselves.",
    accent: "#aa88ff",
  },
  {
    icon: "⬡",
    cmd: "focus --mode pomodoro",
    title: "Focus Timer",
    desc: "Pomodoro sessions with streak tracking and logged history. Built because we actually needed it — and it works.",
    accent: "#ff8800",
  },
  {
    icon: "◫",
    cmd: "notes --pin --search",
    title: "Notes",
    desc: "Pinnable, colour-coded notes with autosave and full-text search. Lightweight and instant — the way notes should be.",
    accent: "#ff3366",
  },
  {
    icon: "◎",
    cmd: "presence --live",
    title: "Live Presence",
    desc: "See exactly who's online, in a call, or locked in a focus session. Real-time, built on our own presence heartbeat system.",
    accent: "#00ffcc",
  },
];

const team = [
  {
    name: "Aakshat Hariharan",
    role: "Director of Cybersecurity & Threat Intelligence",
    detail: "Locked the whole thing down. Zero-trust auth, cryptographic data integrity, threat surface reduction — the reason nothing here is breakable.",
    initials: "AH",
    accent: "#ff3366",
  },
  {
    name: "Advaith Banigandlapati",
    role: "Principal Engineer & Product Architect",
    detail: "Built most of what you're looking at right now. Designed the visual system, architected the full-stack feature set, and made every interaction feel intentional.",
    initials: "AB",
    accent: "#00aaff",
  },
  {
    name: "Abhimanyu Daripally",
    role: "Backend Infrastructure & Systems Architect",
    detail: "The engine room. Database schemas, API contracts, real-time pipelines, server infrastructure — all the hard stuff no one sees but everyone depends on.",
    initials: "AD",
    accent: "#aa88ff",
  },
  {
    name: "Nivas Palaniappan",
    role: "Head of Growth, Brand & Digital Strategy",
    detail: "Gives the work a voice. Shapes how Hashbrowns is seen, builds the brand, and turns what we build into a story that actually lands.",
    initials: "NP",
    accent: "#00ff88",
  },
];

const stack = ["Next.js 15", "TypeScript", "MongoDB", "NextAuth", "Tailwind CSS", "Framer Motion", "Zod", "Zustand", "WebRTC", "bcrypt", "AES-256-GCM", "DTLS-SRTP"];

const stats = [
  { value: "E2E", label: "ENCRYPTED" },
  { value: "6", label: "MODULES BUILT" },
  { value: "4", label: "ENGINEERS" },
  { value: "100%", label: "CUSTOM CODE" },
];

function TypingText({ lines, speed = 40 }: { lines: string[]; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    if (lineIdx >= lines.length) return;
    const line = lines[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayed((p) => p + line[charIdx]);
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplayed((p) => p + "\n");
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [charIdx, lineIdx, lines, speed]);

  return (
    <pre className="font-mono text-xs leading-relaxed" style={{ color: "#444", whiteSpace: "pre-wrap" }}>
      {displayed}
      <span className="inline-block w-2 h-3 align-middle animate-[blink_1s_step-end_infinite]" style={{ background: "#00ff88" }} />
    </pre>
  );
}

function GlitchTitle() {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const fire = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    };
    const id = setInterval(fire, 3500 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative select-none" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
      <h1
        className="text-[clamp(3.5rem,12vw,9rem)] font-black tracking-tighter leading-none"
        style={{
          color: "#f0f0f0",
          textShadow: glitch
            ? "3px 0 #ff3366, -3px 0 #00aaff, 0 0 20px #00ff8840"
            : "0 0 60px rgba(0,255,136,0.15)",
          transition: glitch ? "none" : "text-shadow 0.3s ease",
          transform: glitch ? "translateX(2px)" : "translateX(0)",
        }}
      >
        TEMPO
      </h1>
      {glitch && (
        <>
          <h1
            className="absolute inset-0 text-[clamp(3.5rem,12vw,9rem)] font-black tracking-tighter leading-none pointer-events-none"
            style={{ color: "#ff3366", clipPath: "inset(30% 0 60% 0)", transform: "translateX(-4px)", opacity: 0.8 }}
            aria-hidden
          >
            TEMPO
          </h1>
          <h1
            className="absolute inset-0 text-[clamp(3.5rem,12vw,9rem)] font-black tracking-tighter leading-none pointer-events-none"
            style={{ color: "#00aaff", clipPath: "inset(60% 0 20% 0)", transform: "translateX(4px)", opacity: 0.8 }}
            aria-hidden
          >
            TEMPO
          </h1>
        </>
      )}
    </div>
  );
}

function Orb({ x, y, color, size, delay }: { x: string; y: string; color: string; size: number; delay: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: `blur(${size * 0.6}px)`,
        opacity: 0.12,
        animation: `float ${5 + delay}s ease-in-out ${delay}s infinite alternate`,
        pointerEvents: "none",
      }}
    />
  );
}

export default function HomeContent() {

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes borderPulse {
          0%,100% { border-color: rgba(0,255,136,0.15); }
          50% { border-color: rgba(0,255,136,0.4); }
        }
        @keyframes appear {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .fade-up-1 { animation: fadeUp 0.6s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.35s ease both; }
        .fade-up-4 { animation: fadeUp 0.6s 0.5s ease both; }
        .hero-card {
          background: #080808;
          border: 1px solid #141414;
          border-radius: 20px;
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .hero-card:hover {
          border-color: #1e1e1e;
          box-shadow: 0 0 40px rgba(0,0,0,0.8), 0 0 1px rgba(0,255,136,0.1);
          transform: translateY(-2px);
        }
        .feature-card {
          background: #060606;
          border: 1px solid #111;
          border-radius: 16px;
          padding: 24px;
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
          cursor: default;
        }
        .feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        .team-card {
          background: #060606;
          border: 1px solid #111;
          border-radius: 16px;
          padding: 20px;
          transition: border-color 0.25s, transform 0.25s;
        }
        .team-card:hover { transform: translateY(-2px); }
        .btn-primary {
          background: #00ff88;
          color: #000;
          font-family: var(--font-geist-mono), monospace;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 14px 28px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: box-shadow 0.2s, transform 0.15s, background 0.2s;
        }
        .btn-primary:hover {
          box-shadow: 0 0 40px #00ff8870, 0 4px 20px rgba(0,0,0,0.4);
          transform: translateY(-2px);
          background: #00ffaa;
        }
        .btn-secondary {
          background: transparent;
          color: #666;
          font-family: var(--font-geist-mono), monospace;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          padding: 14px 28px;
          border-radius: 10px;
          border: 1px solid #1a1a1a;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s, transform 0.15s;
        }
        .btn-secondary:hover {
          border-color: #00ff8830;
          color: #00ff88;
          transform: translateY(-2px);
        }
        .stat-box {
          background: #080808;
          border: 1px solid #131313;
          border-radius: 12px;
          padding: 16px 20px;
          text-align: center;
        }
        .scanline-overlay {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 9999;
        }
        .marquee-track {
          display: flex;
          gap: 0;
          animation: marquee 18s linear infinite;
          white-space: nowrap;
        }
        .corner-accent {
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: #00ff8830;
          border-style: solid;
        }
        .noise-overlay {
          position: fixed;
          inset: 0;
          opacity: 0.025;
          pointer-events: none;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
        }
      `}</style>

      {/* Scanline + noise overlays */}
      <div className="scanline-overlay" aria-hidden />
      <div className="noise-overlay" aria-hidden />

      <main style={{ background: "#030303", minHeight: "100vh", color: "#f0f0f0", overflowX: "hidden" }}>
        {/* Grid background */}
        <div aria-hidden style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(0,255,136,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,0.03) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Orbs */}
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
          <Orb x="10%" y="15%" color="radial-gradient(circle,#00ff88,transparent)" size={500} delay={0} />
          <Orb x="75%" y="5%" color="radial-gradient(circle,#0055ff,transparent)" size={400} delay={2} />
          <Orb x="50%" y="60%" color="radial-gradient(circle,#aa00ff,transparent)" size={350} delay={1} />
          <Orb x="85%" y="70%" color="radial-gradient(circle,#ff3366,transparent)" size={300} delay={3} />
        </div>

        {/* ── NAV ─────────────────────────────────────── */}
        <nav
          className="fade-up"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 32px",
            background: "rgba(3,3,3,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #111",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#0a0a0a", border: "1px solid #00ff8840",
              display: "grid", placeItems: "center",
              boxShadow: "0 0 16px #00ff8820",
            }}>
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
                <rect x="4" y="7.5" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="4" y="11" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="7.5" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
                <rect x="11" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, fontWeight: 700, color: "#f0f0f0", letterSpacing: "0.08em" }}>TEMPO</span>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#333", letterSpacing: "0.15em", marginLeft: 4 }}>v2.0</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, color: "#ff3366", letterSpacing: "0.12em" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#ff3366", marginRight: 5, verticalAlign: "middle", boxShadow: "0 0 6px #ff3366" }} />
              RESTRICTED
            </span>
            <Link href="/login" className="btn-primary" style={{ fontSize: 11, padding: "10px 18px" }}>
              SIGN IN ——›
            </Link>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────── */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", position: "relative", zIndex: 2 }}>
          <div className="fade-up" style={{ maxWidth: 800, width: "100%", textAlign: "center" }}>
            {/* Badge */}
            <div className="fade-up" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 10, letterSpacing: "0.15em",
              color: "#00ff88", background: "#00ff8808",
              border: "1px solid #00ff8820", borderRadius: 100,
              padding: "6px 14px", marginBottom: 32,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88", display: "inline-block" }} />
              INTERNAL WORKSPACE · HASHBROWNS ONLY
            </div>

            {/* Glitch title */}
            <div className="fade-up-1" style={{ marginBottom: 12 }}>
              <GlitchTitle />
            </div>

            <div className="fade-up-2" style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "clamp(14px, 2.5vw, 20px)",
              color: "#333",
              letterSpacing: "0.25em",
              marginBottom: 40,
              textTransform: "uppercase",
            }}>
              unified team workspace — built by hashbrowns
            </div>

            {/* Terminal typing box */}
            <div className="fade-up-3 hero-card" style={{ maxWidth: 480, margin: "0 auto 40px", padding: 24, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #111" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffbd2e" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c940" }} />
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, color: "#2a2a2a", marginLeft: 8, letterSpacing: "0.1em" }}>tempo@hashbrowns ~ %</span>
              </div>
              <TypingText
                lines={[
                  "$ tempo init --workspace hashbrowns",
                  "  built by: AH, AB, AD, NP",
                  "  modules: 6 shipped, 0 outsourced",
                  "  security: zero-trust, AES-256-GCM",
                  "  status: online. we went all in.",
                  "  welcome home, hashbrowns.",
                ]}
                speed={35}
              />
            </div>

            {/* CTAs */}
            <div className="fade-up-4" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <Link href="/login" className="btn-primary">
                ENTER THE WORKSPACE ——›
              </Link>
              <Link href="/signup" className="btn-secondary">
                JOIN HASHBROWNS
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{
            position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 9, color: "#2a2a2a", letterSpacing: "0.2em",
            animation: "float 3s ease-in-out infinite",
          }}>
            <span>SCROLL</span>
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
              <path d="M5 1v12M1 9l4 4 4-4" stroke="#2a2a2a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 2, padding: "0 24px 80px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12 }}>
            {stats.map((s) => (
              <div key={s.label} className="stat-box">
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: "#00ff88", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#333", letterSpacing: "0.2em", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 2, padding: "40px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#00ff88", letterSpacing: "0.25em", marginBottom: 12 }}>
              — WHAT WE SHIPPED —
            </div>
            <h2 style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: "#f0f0f0", margin: 0 }}>
              SIX MODULES. ALL OURS.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 16 }}>
            {features.map((f) => (
              <div key={f.title} className="feature-card" style={{ position: "relative", overflow: "hidden" }} onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = f.accent + "30";
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 40px ${f.accent}08, 0 20px 60px rgba(0,0,0,0.6)`;
              }} onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#111";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              }}>
                {/* Corner accents */}
                <div style={{ position: "absolute", top: 10, left: 10, width: 10, height: 10, borderTop: `1px solid ${f.accent}40`, borderLeft: `1px solid ${f.accent}40` }} />
                <div style={{ position: "absolute", bottom: 10, right: 10, width: 10, height: 10, borderBottom: `1px solid ${f.accent}40`, borderRight: `1px solid ${f.accent}40` }} />

                {/* Command line */}
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, color: "#2a2a2a", letterSpacing: "0.08em", marginBottom: 16 }}>
                  <span style={{ color: "#333" }}>$ tempo</span> <span style={{ color: f.accent + "80" }}>{f.cmd}</span>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: f.accent + "10", border: `1px solid ${f.accent}25`,
                    display: "grid", placeItems: "center",
                    fontSize: 16, color: f.accent,
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, fontWeight: 700, color: "#e0e0e0", margin: 0, letterSpacing: "0.04em" }}>{f.title}</h3>
                  </div>
                </div>
                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#3a3a3a", lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TEAM ─────────────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 2, padding: "40px 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#ff3366", letterSpacing: "0.25em", marginBottom: 12 }}>
              — THE PEOPLE WHO BUILT THIS —
            </div>
            <h2 style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 900, color: "#f0f0f0", margin: 0 }}>
              HASHBROWNS
            </h2>
            <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#2a2a2a", marginTop: 12, letterSpacing: "0.06em" }}>
              Four engineers. One platform. Completely from scratch.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 16 }}>
            {team.map((member) => (
              <div
                key={member.name}
                className="team-card"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = member.accent + "30";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#111";
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, marginBottom: 16,
                  background: member.accent + "10", border: `1px solid ${member.accent}30`,
                  display: "grid", placeItems: "center",
                }}>
                  <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 16, fontWeight: 900, color: member.accent }}>{member.initials}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, fontWeight: 700, color: "#d0d0d0", margin: 0 }}>{member.name}</h3>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: member.accent, boxShadow: `0 0 6px ${member.accent}`, flexShrink: 0, display: "block" }} />
                </div>

                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: member.accent, letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>
                  {member.role}
                </p>
                <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, color: "#2e2e2e", lineHeight: 1.7, margin: 0 }}>
                  {member.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── STACK MARQUEE ────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 2, padding: "20px 0 40px", overflow: "hidden" }}>
          <div style={{ borderTop: "1px solid #0e0e0e", borderBottom: "1px solid #0e0e0e", padding: "16px 0", background: "#040404" }}>
            <div style={{ display: "flex", overflow: "hidden" }}>
              <div className="marquee-track">
                {[...stack, ...stack].map((s, i) => (
                  <span key={i} style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 11, color: "#222",
                    letterSpacing: "0.15em",
                    padding: "0 32px",
                    borderRight: "1px solid #111",
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA BOTTOM ───────────────────────────────── */}
        <section style={{ position: "relative", zIndex: 2, padding: "60px 24px 80px", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            background: "#070707",
            border: "1px solid #141414",
            borderRadius: 20,
            padding: "48px 40px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Corner accents */}
            <div style={{ position: "absolute", top: 14, left: 14, width: 14, height: 14, borderTop: "1px solid #00ff8830", borderLeft: "1px solid #00ff8830" }} />
            <div style={{ position: "absolute", top: 14, right: 14, width: 14, height: 14, borderTop: "1px solid #00ff8830", borderRight: "1px solid #00ff8830" }} />
            <div style={{ position: "absolute", bottom: 14, left: 14, width: 14, height: 14, borderBottom: "1px solid #00ff8830", borderLeft: "1px solid #00ff8830" }} />
            <div style={{ position: "absolute", bottom: 14, right: 14, width: 14, height: 14, borderBottom: "1px solid #00ff8830", borderRight: "1px solid #00ff8830" }} />

            <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#00ff88", letterSpacing: "0.25em", marginBottom: 16 }}>
              THIS IS OURS.
            </div>
            <h2 style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: "clamp(1.2rem,2.5vw,1.6rem)", fontWeight: 900, color: "#f0f0f0", margin: "0 0 12px" }}>
              GET IN THERE, HASHBROWNS
            </h2>
            <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#2a2a2a", lineHeight: 1.8, marginBottom: 32 }}>
              Sign in and get to work. This is the platform we built — use it.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <Link href="/login" className="btn-primary">SIGN IN ——›</Link>
              <Link href="/signup" className="btn-secondary">JOIN THE TEAM</Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────── */}
        <footer style={{
          borderTop: "1px solid #0a0a0a",
          padding: "24px",
          textAlign: "center",
          position: "relative",
          zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0a0a0a", border: "1px solid #00ff8825", display: "grid", placeItems: "center" }}>
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none">
                <rect x="4" y="7.5" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="4" y="11" width="12" height="1.5" rx="0.75" fill="#00ff88"/>
                <rect x="7.5" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
                <rect x="11" y="4" width="1.5" height="12" rx="0.75" fill="#00ff88"/>
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, color: "#222", letterSpacing: "0.15em" }}>TEMPO · HASH BROWNS · {new Date().getFullYear()}</span>
          </div>
          <p style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: "#151515", letterSpacing: "0.15em" }}>
            PRIVATE · E2E ENCRYPTED · SELF-HOSTED
          </p>
        </footer>
      </main>
    </>
  );
}
