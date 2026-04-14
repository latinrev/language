import * as React from "react";

type TooltipContextValue = {
  content: string;
  setContent: (content: string) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ children }: { children: React.ReactNode; delayDuration?: number; skipDelayDuration?: number }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [content, setContent] = React.useState("");
  return <TooltipContext.Provider value={{ content, setContent }}>{children}</TooltipContext.Provider>;
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(TooltipContext);
  React.useEffect(() => {
    if (!ctx) return;
    const value = typeof children === "string" ? children : "";
    ctx.setContent(value);
  }, [children, ctx]);
  return null;
}

export function TooltipTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(TooltipContext);
  const title = ctx?.content ?? "";
  if (asChild) {
    return React.cloneElement(children, { title });
  }
  return <span title={title}>{children}</span>;
}
