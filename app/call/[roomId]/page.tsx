"use client";

/**
 * CallRoomPage — triggers the persistent VideoCall in providers.tsx.
 *
 * The actual VideoCall component lives in Providers (app/providers.tsx) so it
 * never unmounts when the user navigates to other pages. This page just tells
 * the store which room is active; providers.tsx renders the VideoCall overlay.
 */

import { use, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useTempoStore } from "@/store/use-tempo-store";

export default function CallRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const setActiveCallRoomId = useTempoStore((s) => s.setActiveCallRoomId);
  const activeCallRoomId = useTempoStore((s) => s.activeCallRoomId);

  useEffect(() => {
    // Only set if not already in a different call
    if (!activeCallRoomId || activeCallRoomId === roomId) {
      setActiveCallRoomId(roomId);
    }
    // NOTE: intentionally NOT clearing on unmount —
    // clearing happens when the user clicks "End call" inside VideoCall.
  }, [roomId, activeCallRoomId, setActiveCallRoomId]);

  return (
    <AppShell>
      {/* Content area is behind the VideoCall overlay from providers.tsx.
          If the user hasn't started the call yet (pin-entry phase), the
          overlay shows the PIN card. Once active it shows the full call UI. */}
      <div className="min-h-[60vh]" />
    </AppShell>
  );
}
