"use client";
import * as React from "react";
export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-slate-300",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
