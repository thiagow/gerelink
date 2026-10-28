"use client";

import { useRef, useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    navigator.vibrate?.(12);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2400);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="group relative w-full overflow-hidden rounded-2xl bg-[var(--brand)] px-6 py-4 text-base font-medium text-black transition active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span className={`transition-opacity ${copied ? "opacity-0" : "opacity-100"}`}>
          Copiar código Pix
        </span>
        <span
          aria-hidden="true"
          className={`absolute inset-0 grid place-items-center transition-opacity ${copied ? "opacity-100" : "opacity-0"}`}
        >
          Código copiado ✓
        </span>
      </button>
      <output aria-live="polite" className="sr-only">
        {copied ? "Código Pix copiado" : ""}
      </output>
    </>
  );
}
