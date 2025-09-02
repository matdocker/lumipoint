"use client";
import * as React from "react";

type Variant = "default" | "secondary" | "outline" | "destructive";
const base =
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  default: "bg-slate-900 text-white hover:bg-slate-800 px-4 py-2",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 px-4 py-2",
  outline: "border border-slate-300 text-slate-900 hover:bg-slate-50 px-4 py-2",
  destructive: "bg-red-600 text-white hover:bg-red-700 px-4 py-2",
};

export function Button({
  className = "",
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={[base, variants[variant], className].join(" ")} {...props} />;
}
