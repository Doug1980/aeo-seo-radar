"use client";

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function UserMenu() {
	const { data: session } = useSession();
	const [open, setOpen] = useState(false);

	if (!session?.user) return null;

	const { name, email, image } = session.user;

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
			>
				{image ? (
					<Image
						src={image}
						alt={name ?? "Avatar"}
						width={36}
						height={36}
						className="rounded-full border border-border"
					/>
				) : (
					<div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-semibold text-sm">
						{name?.[0]?.toUpperCase() ?? "?"}
					</div>
				)}
			</button>

			{open && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-10 cursor-default"
						onClick={() => setOpen(false)}
						aria-label="Fechar menu"
					/>
					<div className="absolute right-0 mt-2 w-56 bg-surface-raised border border-border rounded-xl shadow-lg z-20 p-1">
						<div className="px-4 py-3 border-b border-border">
							<p className="text-sm font-medium text-text truncate">{name}</p>
							<p className="text-xs text-muted truncate">{email}</p>
						</div>
						<button
							type="button"
							onClick={() => signOut({ callbackUrl: "/login" })}
							className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-inset rounded-lg mt-1 transition-colors cursor-pointer"
						>
							Sair
						</button>
					</div>
				</>
			)}
		</div>
	);
}
