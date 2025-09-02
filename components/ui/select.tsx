"use client";
import * as React from "react";

export function Select({
  value,
  onValueChange,
  children,
  className = "",
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={[
        "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-slate-300",
        className,
      ].join(" ")}
    >
      {children}
    </select>
  );
}

// Compatibility wrappers (keep your existing imports working)
export function SelectTrigger({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={["w-full", className].join(" ")}>{children}</div>;
}
export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <option disabled value="">{placeholder ?? "Select"}</option>;
}
export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}
