"use client";
import * as React from "react";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        "transition-shadow hover:shadow-md",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["p-5 md:p-6", className].join(" ")} {...props} />;
}
