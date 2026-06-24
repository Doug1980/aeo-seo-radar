import type { DefaultSession } from "next-auth";

// Expõe o id estável do usuário na sessão (usado como `sub` do JWT da API).
declare module "next-auth" {
	interface Session {
		user: {
			id: string;
		} & DefaultSession["user"];
	}
}
