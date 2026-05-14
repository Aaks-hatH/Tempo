"use client";

import { SessionProvider } from "next-auth/react";
import { PersonalizationProvider } from "@/components/personalization-provider";
import { useTempoStore } from "@/store/use-tempo-store";
import { VideoCall } from "@/components/video-call";
import { usePathname } from "next/navigation";
import Link from "next/link";

/**
 * PersistentVideoCall — renders the VideoCall in ONE place (providers.tsx)
 * so it NEVER unmounts when the user navigates to other tabs.
 *
 * On /call/[roomId]: full-screen overlay covering the main content area.
 * On any other page: hidden (visibility:hidden keeps WebRTC alive) + a
 * floating "Return to call" badge so the user can jump back.
 */
function PersistentVideoCall() {
  const activeCallRoomId = useTempoStore((s) => s.activeCallRoomId);
  const pathname = usePathname();

  if (!activeCallRoomId) return null;

  const isOnCallPage = pathname === `/call/${activeCallRoomId}`;

  return (
    <>
      {/* Single VideoCall instance — always mounted while call is active.
          On call page: shown as full-screen content overlay.
          On other pages: hidden with visibility:hidden (keeps video tracks
          playing) so the WebRTC connection is never destroyed. */}
      <div
        style={
          isOnCallPage
            ? {
                position: "fixed",
                // Account for sidebar on desktop (240px = w-60)
                left: "var(--sidebar-offset, 0px)",
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 25,
                background: "rgb(2 6 12)",
                overflowY: "auto",
                padding: "2rem 2rem 6rem",
              }
            : {
                // Hidden but mounted — WebRTC + media tracks stay alive
                position: "fixed",
                visibility: "hidden",
                pointerEvents: "none",
                width: 1,
                height: 1,
                overflow: "hidden",
                top: -9999,
                left: -9999,
              }
        }
      >
        <style>{`
          @media (min-width: 1024px) {
            :root { --sidebar-offset: 240px; }
          }
          @media (max-width: 1023px) {
            :root { --sidebar-offset: 0px; }
          }
        `}</style>
        <VideoCall roomId={activeCallRoomId} />
      </div>

      {/* Floating "Return to call" badge when navigated away */}
      {!isOnCallPage && (
        <Link
          href={`/call/${activeCallRoomId}`}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2.5 rounded-2xl border border-green-400/30 bg-black/90 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,.6)] backdrop-blur-xl transition-all hover:border-green-400/60 hover:bg-black/95 lg:bottom-6"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-400" />
          </span>
          <span className="text-xs font-medium text-green-300">In call</span>
          <span className="text-[10px] text-slate-500">Return ↗</span>
        </Link>
      )}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PersonalizationProvider>
        {children}
        {/* Rendered outside page trees so it persists across route changes */}
        <PersistentVideoCall />
      </PersonalizationProvider>
    </SessionProvider>
  );
}
