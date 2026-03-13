import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
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
        async jwt({ token, user, account, trigger, session }) {
            // Persist role and provider into the JWT token
            if (user) {
                token.role = (user as any).role ?? "SEEKER";
                token.id = user.id;
            }
            if (account?.provider === "google") {
                token.role = token.role ?? "SEEKER";
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
            }
            return session;
        },
    },
};
