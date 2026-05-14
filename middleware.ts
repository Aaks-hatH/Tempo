export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/projects/:path*",
    "/chat/:path*",
    "/notes/:path*",
    "/focus/:path*",
    "/call/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/tasks/:path*",
    "/api/calendar/:path*",
    "/api/projects/:path*",
    "/api/chat/:path*",
    "/api/notes/:path*",
    "/api/focus/:path*",
    "/api/dashboard/:path*",
    "/api/users/:path*",
    "/api/activity/:path*",
    "/api/presence/:path*",
    "/api/settings/:path*",
    "/api/admin/:path*",
  ],
};
