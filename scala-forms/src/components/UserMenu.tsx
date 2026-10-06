"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/auth-actions";
import type { User } from "@/lib/auth";

export const initials = (n: string) => n.trim().slice(0, 2).replace(/^./, (c) => c.toUpperCase());

export default function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-600 text-white">{initials(user.name)}</span>
        <span className="text-gray-500">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-md bg-surface py-2 shadow-lg ring-1 ring-gray-200">
          <div className="flex items-center gap-3 px-5 py-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-700 text-xs text-white">{initials(user.name)}</span>
            <div className="min-w-0">
              <div className="truncate text-gray-800">{user.name}</div>
              <div className="truncate text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
          <div className="my-2 border-t border-gray-100" />
          {user.role === "admin" && <Link href="/dash/team" className="block px-5 py-2 text-gray-700 hover:bg-gray-50">Seus times</Link>}
          <Link href="/dash/account" className="block px-5 py-2 text-gray-700 hover:bg-gray-50">Configurações</Link>
          <form action={logoutAction}>
            <button className="block w-full px-5 py-2 text-left text-gray-700 hover:bg-gray-50">Sair</button>
          </form>
        </div>
      )}
    </div>
  );
}
