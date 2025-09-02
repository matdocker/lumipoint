"use client";
import * as React from "react";

type Variant = "default" | "secondary" | "destructive";
const styles: Record<Variant, string> = {
  default: "bg-slate-900 text-white",
  secondary: "bg-slate-100 text-slate-900 border border-slate-300",
  destructive: "bg-red-100 text-red-700 border border-red-300",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        styles[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}
