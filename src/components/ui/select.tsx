import * as React from "react";
import { cn } from "@/lib/utils";

type SelectItemType = { value: string; label: string };
type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  items: SelectItemType[];
  registerItem: (item: SelectItemType) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [items, setItems] = React.useState<SelectItemType[]>([]);
  const registerItem = React.useCallback((item: SelectItemType) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.value === item.value);
      if (!existing) return [...prev, item];
      if (existing.label === item.label) return prev;
      return prev.map((x) => (x.value === item.value ? item : x));
    });
  }, []);

  return <SelectContext.Provider value={{ value, onValueChange, items, registerItem }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className }: React.HTMLAttributes<HTMLSelectElement>) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return (
    <select
      value={ctx.value}
      onChange={(e) => ctx.onValueChange(e.target.value)}
      className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm", className)}
    >
      {ctx.items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export function SelectValue() {
  return null;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  const label = React.useMemo(() => {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) {
      return children
        .map((part) => (typeof part === "string" ? part : ""))
        .join("")
        .trim();
    }
    return String(children ?? value);
  }, [children, value]);

  React.useEffect(() => {
    ctx?.registerItem({ value, label });
  }, [ctx, label, value]);

  return null;
}
