import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

export function Slider({ value = [0], min = 0, max = 100, step = 1, onValueChange, className }: SliderProps) {
  return (
    <input
      type="range"
      value={value[0] ?? 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn("h-2 w-full cursor-pointer accent-primary", className)}
    />
  );
}
