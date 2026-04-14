import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "default" | "sm" | "icon";

function variantClasses(variant: Variant = "default") {
  if (variant === "outline") return "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
  if (variant === "ghost") return "hover:bg-accent hover:text-accent-foreground";
  if (variant === "secondary") return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
  return "bg-primary text-primary-foreground hover:bg-primary/90";
}

function sizeClasses(size: Size = "default") {
  if (size === "sm") return "h-9 rounded-md px-3";
  if (size === "icon") return "h-10 w-10";
  return "h-10 px-4 py-2";
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
      variantClasses(variant),
      sizeClasses(size),
      className,
    )}
    {...props}
  />
));
Button.displayName = "Button";
