import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import nodemailer from "nodemailer";
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
				host: "smtp.gmail.com",
				port: 465,
				secure: true,
				auth: {
					user: process.env.GMAIL_USER!,
					pass: process.env.GMAIL_APP_PASSWORD!,
				},
			},
			from: process.env.GMAIL_USER!,
			sendVerificationRequest: async ({ identifier, url, provider }) => {
				const { host } = new URL(url);
				const transport = nodemailer.createTransport(provider.server);

				await transport.sendMail({
					to: identifier,
					from: provider.from,
					subject: "Acesse sua conta no AEO & SEO Radar",
					text: `Acesse sua conta no AEO & SEO Radar\n\nEntre pelo link abaixo (válido por 24h, uso único):\n${url}\n\nSe você não solicitou este acesso, ignore este email.`,
					html: buildMagicLinkEmail(url, host),
				});
			},
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

// Template HTML do email de magic link.
// CSS inline + tabelas: clientes de email ignoram <style> e classes.
// Entidades HTML (&ccedil; etc.) evitam bugs de encoding de acentuação.
function buildMagicLinkEmail(url: string, host: string): string {
	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#020617; font-family:Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#020617; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#0f172a; border-radius:12px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:40px 40px 24px;">
              <svg width="110" height="110" viewBox="280 80 120 120" xmlns="http://www.w3.org/2000/svg">
                <circle cx="340" cy="140" r="50" fill="none" stroke="#1e40af" stroke-width="1.5" opacity="0.4"/>
                <circle cx="340" cy="140" r="34" fill="none" stroke="#1e40af" stroke-width="1.5" opacity="0.5"/>
                <circle cx="340" cy="140" r="18" fill="none" stroke="#1e40af" stroke-width="1.5" opacity="0.6"/>
                <circle cx="340" cy="140" r="8" fill="#1e40af" opacity="0.8"/>
                <circle cx="340" cy="140" r="3" fill="#60a5fa"/>
                <line x1="340" y1="140" x2="340" y2="90" stroke="#3b82f6" stroke-width="1" opacity="0.5"/>
                <line x1="340" y1="140" x2="385" y2="115" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
                <circle cx="375" cy="108" r="4" fill="#60a5fa" opacity="0.9"/>
              </svg>
              <div style="color:#f1f5f9; font-size:22px; font-weight:bold; letter-spacing:0.5px; margin-top:8px;">AEO &amp; SEO Radar</div>
              <div style="color:#94a3b8; font-size:11px; letter-spacing:2px; margin-top:4px;">PRESEN&Ccedil;A DIGITAL</div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 40px 40px;">
              <div style="color:#f1f5f9; font-size:18px; font-weight:bold; margin-bottom:12px;">Acesse sua conta</div>
              <div style="color:#94a3b8; font-size:14px; line-height:1.7; margin-bottom:28px;">
                Clique no bot&atilde;o abaixo para entrar no seu dashboard de auditoria.
                Este link &eacute; v&aacute;lido por 24 horas e s&oacute; pode ser usado uma vez.
              </div>
              <a href="${url}" target="_blank"
                 style="display:inline-block; background-color:#2563eb; color:#ffffff; font-size:15px; font-weight:bold; text-decoration:none; padding:14px 40px; border-radius:12px;">
                Entrar no Radar
              </a>
              <div style="color:#64748b; font-size:12px; line-height:1.6; margin-top:28px;">
                Se voc&ecirc; n&atilde;o solicitou este acesso, pode ignorar este email com seguran&ccedil;a.
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#0a0f1d; padding:20px 40px; border-top:1px solid rgba(148,163,184,0.1);">
              <div style="color:#64748b; font-size:11px; line-height:1.6;">
                AEO &amp; SEO Radar &mdash; Auditoria de presen&ccedil;a digital<br/>
                Este &eacute; um email autom&aacute;tico, n&atilde;o responda.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
