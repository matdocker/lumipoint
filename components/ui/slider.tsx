"use client";
import * as React from "react";

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className = "",
}: {
  value: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number[]) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      className={[
        "w-full appearance-none bg-transparent",
        "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-200",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:mt-[-6px]",
        className,
      ].join(" ")}
    />
  );
}
