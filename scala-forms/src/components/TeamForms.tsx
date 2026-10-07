"use client";
import { useActionState, useTransition } from "react";
import {
  addMemberAction,
  removeMemberAction,
  setRoleAction,
  updateAccountAction,
  type TeamState,
} from "@/app/dash/actions";

export function AddMember() {
  const [state, run, pending] = useActionState<TeamState, FormData>(addMemberAction, {});
  return (
    <form action={run} className="grid gap-3 rounded-lg border border-gray-200 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2 text-lg font-semibold text-gray-800">Adicionar pessoa ao time</div>
      <input name="name" className="input" placeholder="Nome" required />
      <input name="email" type="email" className="input" placeholder="E-mail" required />
      <input name="password" className="input" placeholder="Senha provisória (mín. 8)" required minLength={8} />
      <select name="role" className="input" defaultValue="member">
        <option value="member">Membro: cria e edita formulários, vê respostas</option>
        <option value="admin">Administrador: também gerencia o time</option>
      </select>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar"}
        </button>
        {state.error && <span className="text-sm text-rose-400">{state.error}</span>}
        {state.ok && <span className="text-sm text-emerald-400">{state.ok}</span>}
      </div>
    </form>
  );
}

export function MemberRow({
  id,
  name,
  email,
  role,
  isMe,
}: {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  isMe: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-4 border-b border-gray-100 py-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-700 text-sm text-white">
        {name.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-gray-800">
          {name} {isMe && <span className="text-sm text-gray-400">(você)</span>}
        </div>
        <div className="text-sm text-gray-500">{email}</div>
      </div>
      <select
        className="input w-40"
        value={role}
        disabled={isMe || pending}
        onChange={(e) => start(() => setRoleAction(id, e.target.value as "admin" | "member"))}
      >
        <option value="member">Membro</option>
        <option value="admin">Administrador</option>
      </select>
      {!isMe && (
        <button
          className="text-sm text-rose-400 hover:underline"
          disabled={pending}
          onClick={() => {
            if (confirm(`Remover ${name} do time?`)) start(() => removeMemberAction(id));
          }}
        >
          Remover
        </button>
      )}
    </div>
  );
}

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, run, pending] = useActionState<TeamState, FormData>(updateAccountAction, {});
  return (
    <form action={run} className="space-y-6">
      <label className="block">
        <span className="text-xl text-gray-800">Nome</span>
        <input name="name" defaultValue={name} className="input mt-2 py-3 text-lg" />
      </label>
      <label className="block">
        <span className="text-xl text-gray-800">E-mail</span>
        <input value={email} disabled className="input mt-2 bg-gray-50 py-3 text-lg text-gray-500" />
      </label>
      <label className="block">
        <span className="text-xl text-gray-800">Nova senha</span>
        <span className="block text-gray-600">Deixe em branco para manter a atual.</span>
        <input name="password" type="password" className="input mt-2 py-3 text-lg" autoComplete="new-password" />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          Atualizar
        </button>
        {state.error && <span className="text-sm text-rose-400">{state.error}</span>}
        {state.ok && <span className="text-sm text-emerald-400">{state.ok}</span>}
      </div>
    </form>
  );
}
