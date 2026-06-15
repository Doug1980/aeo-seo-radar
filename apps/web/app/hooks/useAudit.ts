import type { ApiResponse, DomainAudit } from "@aeo-seo-radar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

function useAuthHeaders() {
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;

	return {
		"Content-Type": "application/json",
		...(userId ? { "x-user-id": userId } : {}),
	};
}

export function useAuditHistory() {
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;
	const headers = {
		...(userId ? { "x-user-id": userId } : {}),
	};

	return useQuery<DomainAudit[]>({
		queryKey: ["audit-history", userId],
		queryFn: async () => {
			const res = await fetch(`${API}/audits`, { headers });
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
	return useQuery<DomainAudit>({
		queryKey: ["audit", id],
		queryFn: async () => {
			const res = await fetch(`${API}/audits/${id}`);
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
		enabled: !!id,
		refetchOnWindowFocus: false,
		refetchInterval: enablePolling ? 5000 : false,
	});
}

export function useCreateAudit() {
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const userId = session?.user?.email ?? null;

	return useMutation<ApiResponse<DomainAudit>, Error, string>({
		mutationFn: async (domain: string) => {
			const res = await fetch(`${API}/audits`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(userId ? { "x-user-id": userId } : {}),
				},
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
