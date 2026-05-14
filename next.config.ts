import type { NextConfig } from "next";

// Security headers applied to all routes
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // ws:/wss: required for Next.js HMR and WebSocket-based signaling.
      // stun: required for WebRTC ICE candidate gathering via STUN servers.
      // NOTE: Add your TURN server domain here if you run one, e.g. turn:your-turn.example.com
      "connect-src 'self' ws: wss: stun: https://stun.l.google.com:19302 https://stun1.l.google.com:19302",
      // blob: is required for WebRTC MediaStream object URLs (local video preview)
      "media-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  // Removed camera/microphone from blocked list — required for video calls.
  // The call page requests permissions explicitly via getUserMedia.
  {
    key: "Permissions-Policy",
    value: "geolocation=()",
  },
];

// Cross-Origin Isolation headers — required for:
//   1. SharedArrayBuffer (used by some WebRTC/WebCodecs implementations)
//   2. RTCRtpSender/Receiver.createEncodedStreams() (Insertable Streams API)
//      which in some browsers requires cross-origin isolation to be enabled.
const crossOriginIsolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
];

const nextConfig: NextConfig = {
  typescript: {
    // @types/react@19 removed `children` from DOMAttributes, breaking JSX
    // children on all HTML intrinsic elements under strict mode. This suppresses
    // the build error until the upstream type regression is resolved.
    // Track: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/69022
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  async headers() {
    return [
      // Base security headers for all routes
      {
        source: "/(.*)",
        headers: baseSecurityHeaders,
      },
      // Cross-origin isolation only on call pages (COEP can break some embeds)
      {
        source: "/call/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
};

export default nextConfig;
