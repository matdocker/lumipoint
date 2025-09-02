"use client";
import * as React from "react";

export function Switch({
  checked,
  onCheckedChange,
  className = "",
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
        checked ? "bg-slate-900" : "bg-slate-300",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
