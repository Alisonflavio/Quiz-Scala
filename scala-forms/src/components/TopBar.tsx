import Link from "next/link";
import type { User } from "@/lib/auth";
import UserMenu from "./UserMenu";

export function Logo() {
  return (
    <Link href="/dash" className="flex shrink-0 items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm text-white">S</span>
      scala forms
    </Link>
  );
}

export default function TopBar({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#14181e]/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        <span className="hidden rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand sm:inline">
          Empresa
        </span>
        <span className="hidden text-gray-500 md:inline">Performance</span>
      </div>
      <UserMenu user={user} />
    </header>
  );
}
