import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/api";

// Cap absoluto de polling: se a auditoria não concluir nesse tempo, paramos
// (a API também marca audits "running" antigos como "failed").
const POLL_MAX_MS = 3 * 60_000;

const HISTORY_PAGE_SIZE = 20;

/**
 * Histórico paginado por offset. Cada página traz até HISTORY_PAGE_SIZE itens
 * e um `hasMore` da API; as páginas são achatadas num único array (`audits`).
 */
export function useAuditHistory() {
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;

	const query = useInfiniteQuery({
		queryKey: ["audit-history", userId],
		enabled: !!userId,
		initialPageParam: 0,
		queryFn: async ({ pageParam }) => {
			const res = await apiFetch(
				`/api/v1/audits?limit=${HISTORY_PAGE_SIZE}&offset=${pageParam}`,
			);
			if (!res.ok) throw new Error("Erro ao buscar histórico");
			return (await res.json()) as ApiResponse<DomainAudit[]>;
		},
		getNextPageParam: (lastPage, allPages) =>
			lastPage.hasMore ? allPages.length * HISTORY_PAGE_SIZE : undefined,
	});

	return {
		audits: query.data?.pages.flatMap((p) => p.data),
		isLoading: query.isLoading,
		hasNextPage: query.hasNextPage,
		fetchNextPage: query.fetchNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
	};
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
