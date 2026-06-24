import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/api";

// Cap absoluto de polling: se a auditoria não concluir nesse tempo, paramos
// (a API também marca audits "running" antigos como "failed").
const POLL_MAX_MS = 3 * 60_000;

export function useAuditHistory() {
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;
	return useQuery<DomainAudit[]>({
		queryKey: ["audit-history", userId],
		queryFn: async () => {
			const res = await apiFetch("/api/v1/audits");
			if (!res.ok) throw new Error("Erro ao buscar histórico");
			const body = await res.json();
			return body.data;
		},
		enabled: !!userId,
	});
}

export function useAuditById(
	id: string | null,
	enablePolling: boolean = false,
	onDone?: () => void,
) {
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;

	return useQuery<DomainAudit>({
		queryKey: ["audit", id, userId],
		queryFn: async () => {
			const res = await apiFetch(`/api/v1/audits/${id}`);
			if (!res.ok) throw new Error("Erro ao buscar auditoria");
			const body = await res.json();
			const data: DomainAudit = body.data;
			// Concluiu (ou falhou) → para o polling. As recomendações já vêm
			// no mesmo payload do status "completed", então não exigimos que
			// a lista esteja preenchida (evita travar se a IA retornar vazio).
			if (data.status === "completed" || data.status === "failed") {
				onDone?.();
			}
			return data;
		},
		enabled: !!id && !!userId,
		refetchOnWindowFocus: false,
		refetchInterval: (query) => {
			if (!enablePolling) return false;
			const data = query.state.data;
			if (!data) return 2000;
			if (data.status === "completed" || data.status === "failed") {
				return false;
			}
			// Cap baseado na idade REAL da auditoria (createdAt), não no tempo
			// que a tela está aberta — senão o polling nem começa se a aba já
			// estava aberta há mais que o limite.
			const ageMs = Date.now() - new Date(data.createdAt).getTime();
			if (ageMs > POLL_MAX_MS) return false;
			return 2000;
		},
	});
}

export function useCreateAudit() {
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;
	return useMutation<ApiResponse<DomainAudit>, Error, string>({
		mutationFn: async (domain: string) => {
			const res = await apiFetch("/api/v1/audits", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ domain }),
			});
			if (!res.ok) throw new Error("Falha ao iniciar auditoria");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["audit-history", userId] });
		},
	});
}
