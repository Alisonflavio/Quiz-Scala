"use client";

export default function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-14 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-gray-300"} disabled:opacity-50`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-8" : "left-1"}`} />
      {on && <span className="absolute left-2 top-1 text-xs text-white/80">✓</span>}
    </button>
  );
}
