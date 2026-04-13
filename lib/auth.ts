import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

const usePrismaAdapter = process.env.NEXTAUTH_USE_PRISMA_ADAPTER === "true";
const allowDevCredentials =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_DEV_CREDENTIALS_AUTH === "true";

// ADMIN emails — these users will always receive the ADMIN role
const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "mbereket523@gmail.com")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
);

function inferRoleFromEmail(email?: string | null): "ADMIN" | "SEEKER" {
    const normalized = (email ?? "").trim().toLowerCase();
    if (adminEmails.has(normalized)) return "ADMIN";
    return "SEEKER";
}

export const authOptions: NextAuthOptions = {
    ...(usePrismaAdapter ? { adapter: PrismaAdapter(prisma) as any } : {}),
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies: process.env.NODE_ENV === "production",
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60,
    },
    jwt: {
        maxAge: 30 * 24 * 60 * 60,
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    cookies: {
        sessionToken: {
            name:
                process.env.NODE_ENV === "production"
                    ? "__Secure-next-auth.session-token"
                    : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        ...(allowDevCredentials
            ? [
                  CredentialsProvider({
                      name: "Email",
                      credentials: {
                          email: { label: "Email", type: "email" },
                      },
                      async authorize(credentials) {
                          const email = credentials?.email?.trim().toLowerCase();
                          if (!email) return null;

                          return {
                              id: "dev-user-001",
                              name: email.split("@")[0],
                              email,
                              role: inferRoleFromEmail(email),
                              image: null,
                          };
                      },
                  }),
              ]
            : []),
    ],
    callbacks: {
        async signIn({ account, profile, user }) {
            if (account?.provider === "google") {
                const email = (user.email ?? "").trim().toLowerCase();
                const audience = account.providerAccountId;
                const googleProfile = profile as Record<string, unknown> | undefined;
                const emailVerified = googleProfile?.email_verified;

                if (!email || emailVerified !== true || !audience) {
                    return false;
                }
            }

            return true;
        },
        async jwt({ token, user, account, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = (user as any).id ?? token.sub ?? token.id;
                token.role = (user as any).role ?? inferRoleFromEmail(user.email);
                token.email = user.email;
            }

            // authorative sync with DB for role changes (e.g. Admin approval)
            const email = token.email as string | undefined;
            if (email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: email.trim().toLowerCase() },
                        select: { id: true, role: true },
                    });

                    if (dbUser) {
                        const inferredRole = inferRoleFromEmail(email);
                        // Hardcoded Admin emails always get ADMIN role
                        if (inferredRole === "ADMIN") {
                            token.role = "ADMIN";
                            if (dbUser.role !== "ADMIN") {
                                await prisma.user.update({
                                    where: { id: dbUser.id },
                                    data: { role: "ADMIN" },
                                }).catch(() => {});
                            }
                        } else {
                            // Otherwise, use what's in the database (e.g. RECRUITER)
                            token.role = dbUser.role;
                        }
                        token.id = dbUser.id;
                    }
                } catch (error) {
                    // Fallback to existing token role if DB is unreachable
                    console.error("[auth] JWT DB sync failed:", error);
                }
            }

            if (trigger === "update" && session) {
                if (typeof (session as any).name === "string") {
                    token.name = (session as any).name.trim().slice(0, 120);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).role = token.role as string;
                if (typeof token.name === "string") {
                    session.user.name = token.name;
                }
                const tokenImage = (token.image as string | undefined) ?? (token.picture as string | undefined);
                if (typeof tokenImage === "string" && tokenImage.length > 0) {
                    session.user.image = tokenImage;
                }
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            const toAbsolute = (path: string) => `${baseUrl}${path}`;
            const forceDashboard = () => toAbsolute("/dashboard");

            if (url.startsWith("/")) {
                if (
                    url === "/" ||
                    url === "/login" ||
                    url.startsWith("/api/auth")
                ) {
                    return forceDashboard();
                }
                return toAbsolute(url);
            }
            if (url.startsWith(baseUrl)) {
                const pathname = url.slice(baseUrl.length) || "/";
                if (
                    url === baseUrl ||
                    url === `${baseUrl}/login` ||
                    url.startsWith(`${baseUrl}/api/auth`)
                ) {
                    return forceDashboard();
                }
                return url;
            }
            return forceDashboard();
        },
    },
};
