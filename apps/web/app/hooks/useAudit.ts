import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRef } from "react";
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
	const startedAt = useRef<number>(Date.now());

	return useQuery<DomainAudit>({
		queryKey: ["audit", id, userId],
		queryFn: async () => {
			const res = await apiFetch(`/api/v1/audits/${id}`);
			if (!res.ok) throw new Error("Erro ao buscar auditoria");
			const body = await res.json();
			const data: DomainAudit = body.data;
			const isDone =
				(data.status === "completed" &&
					(data.recommendations?.length ?? 0) > 0) ||
				data.status === "failed";
			if (isDone) onDone?.();
			return data;
		},
		enabled: !!id && !!userId,
		refetchOnWindowFocus: false,
		refetchInterval: (query) => {
			if (!enablePolling) return false;
			const status = query.state.data?.status;
			if (status === "completed" || status === "failed") return false;
			if (Date.now() - startedAt.current > POLL_MAX_MS) return false;
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
