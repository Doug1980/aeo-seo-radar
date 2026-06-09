'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'

export default function UserMenu() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  if (!session?.user) return null

  const { name, email, image } = session.user

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {image ? (
          <Image
            src={image}
            alt={name ?? 'Avatar'}
            width={36}
            height={36}
            className="rounded-full border border-gray-700"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-20 p-1">
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg mt-1 transition-colors"
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}