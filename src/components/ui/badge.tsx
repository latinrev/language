import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary";

function variantClasses(variant: Variant = "default") {
  if (variant === "secondary") return "bg-secondary text-secondary-foreground";
  return "bg-primary text-primary-foreground";
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", variantClasses(variant), className)} {...props} />;
}
