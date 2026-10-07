"use client";
import type { ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid grid-cols-[minmax(0,1fr)] place-items-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-lg bg-surface shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-5 sm:px-8">
          <h2 className="text-gray-600">{title}</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-500 hover:text-gray-800">
            ×
          </button>
        </div>
        <div className="px-4 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
