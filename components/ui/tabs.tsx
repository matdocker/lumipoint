"use client";
import * as React from "react";

type Ctx = { value: string; setValue: (v: string) => void };
const TabsCtx = React.createContext<Ctx | null>(null);

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className = "",
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [unctrl, setUnctrl] = React.useState(defaultValue ?? "");
  const value = controlled ?? unctrl;
  const setValue = onValueChange ?? setUnctrl;
  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div className={["space-y-4", className].join(" ")}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={[
        "grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-1",
        "sm:inline-flex sm:gap-1 sm:p-1",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={[
        "w-full rounded-xl px-4 py-2 text-sm transition",
        active ? "bg-slate-900 text-white shadow" : "text-slate-700 hover:bg-slate-100",
        className,
      ].join(" ")}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = "",
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
