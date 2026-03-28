import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

const usePrismaAdapter = process.env.NEXTAUTH_USE_PRISMA_ADAPTER === "true";
const recruiterEmails = new Set(
    (process.env.RECRUITER_EMAILS ?? "mbereket523@gmail.com")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
);

function inferRoleFromEmail(email?: string | null): "RECRUITER" | "SEEKER" {
    const normalized = (email ?? "").trim().toLowerCase();
    return recruiterEmails.has(normalized) ? "RECRUITER" : "SEEKER";
}

export const authOptions: NextAuthOptions = {
    ...(usePrismaAdapter ? { adapter: PrismaAdapter(prisma) as any } : {}),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        // Credentials provider — email/password fallback for dev
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                role: { label: "Role", type: "text" },
            },
            async authorize(credentials) {
                // Dev mode: accept any email and return a mock user
                if (!credentials?.email) return null;
                return {
                    id: "dev-user-001",
                    name: credentials.email.split("@")[0],
                    email: credentials.email,
                    role: (credentials.role ?? "SEEKER") as string,
                    image: null,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            console.log("NextAuth SignIn Attempt:", {
                email: user?.email,
                provider: account?.provider,
                hasId: !!process.env.GOOGLE_CLIENT_ID,
                hasSecret: !!process.env.GOOGLE_CLIENT_SECRET
            });
            return true;
        },
        async jwt({ token, user, account, trigger, session }) {
            // Persist role and provider into the JWT token
            if (user) {
                const userRole = (user as any).role as string | undefined;
                token.role = userRole ?? inferRoleFromEmail((user as any).email ?? token.email as string | undefined);
                token.id = (user as any).id ?? token.sub ?? token.id;
                token.image = (user as any).image ?? token.image;
            }
            if (account?.provider === "google") {
                if (!token.role) {
                    token.role = inferRoleFromEmail((token.email as string | undefined) ?? (user as any)?.email);
                }
                token.id = token.id ?? token.sub;
                token.image = (token.picture as string | undefined) ?? (token.image as string | undefined);
            }
            if (trigger === "update" && session) {
                if (typeof (session as any).name === "string") {
                    token.name = (session as any).name;
                }
                if (typeof (session as any).role === "string") {
                    token.role = (session as any).role;
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
