import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
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
		Nodemailer({
			server: {
				host: "smtp-relay.brevo.com",
				port: 587,
				auth: {
					user: process.env.BREVO_SMTP_USER!,
					pass: process.env.BREVO_SMTP_KEY!,
				},
			},
			from: process.env.AUTH_EMAIL_FROM!,
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
