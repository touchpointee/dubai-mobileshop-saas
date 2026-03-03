import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { Shop } from "@/models/Shop";
import type { Role } from "@/lib/constants";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: Role;
    shopId: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      role: Role;
      shopId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    shopId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        context: { label: "Context", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();

        const user = await User.findOne({ email: credentials.email as string }).select("+password");
        if (!user || !user.password) return null;
        if (!user.isActive) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        const context = (credentials.context as string) || "";

        if (context === "admin") {
          if (user.role !== "SUPER_ADMIN") return null;
        } else if (context.startsWith("shop:")) {
          const slug = context.slice(5);
          if (user.role === "SUPER_ADMIN") return null;
          const shop = await Shop.findOne({ slug, isActive: true }).select("_id");
          if (!shop) return null;
          if (user.shopId?.toString() !== shop._id.toString()) return null;
        } else {
          // Landing or missing context: only super admin can log in
          if (user.role !== "SUPER_ADMIN") return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role as Role,
          shopId: user.shopId?.toString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.shopId = token.shopId;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      // Keep user on same host (e.g. admin.localhost) after login
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

export async function getSession() {
  return auth();
}

export function requireRole(allowedRoles: Role[]) {
  return async () => {
    const session = await auth();
    if (!session?.user) return null;
    if (!allowedRoles.includes(session.user.role)) return null;
    return session;
  };
}
