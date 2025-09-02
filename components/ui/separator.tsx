"use client";
import * as React from "react";
export function Separator({ className = "", ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={["my-4 border-slate-200", className].join(" ")} {...props} />;
}
