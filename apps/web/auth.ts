import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import * as schema from "./db/schema";

function getDb() {
	const sql = neon(process.env.DATABASE_URL!);
	return drizzle(sql, { schema });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
	adapter: DrizzleAdapter(getDb()),
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		}),
		GitHub({
			clientId: process.env.AUTH_GITHUB_ID!,
			clientSecret: process.env.AUTH_GITHUB_SECRET!,
		}),
		Resend({
			apiKey: process.env.AUTH_RESEND_KEY!,
			from: "noreply@resend.dev",
		}),
	],
	pages: {
		signIn: "/login",
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isOnLogin = nextUrl.pathname === "/login";
			if (isOnLogin) return true;
			return isLoggedIn;
		},
	},
});
