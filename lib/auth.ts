import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Rate limit: 10 login attempts per email per 15 minutes.
        // Keyed on email so we protect each account individually.
        const rl = await rateLimit(
          `login:${parsed.data.email}`,
          10,
          15 * 60 * 1000,
        );
        if (!rl.success) return null;

        await connectDB();

        const user = await User.findOne({ email: parsed.data.email }).select("+password");

        if (!user?.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(parsed.data.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
          role: user.role ?? "member",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "member";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        (session.user as { role?: string }).role = (token.role as string) ?? "member";
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
};
