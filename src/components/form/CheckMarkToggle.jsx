import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function CheckMarkToggle({
  label,
  checked,
  onChange,
  disabled = false,
  className,
  size = "default",   // "default" | "sm" | "lg"
  variant = "outline" // base button variant when unchecked
}) {
  const padding =
    size === "sm" ? "px-2.5 py-1.5 text-xs" :
    size === "lg" ? "px-4 py-2.5 text-sm" :
    "px-3 py-2 text-sm";

  return (
    <Button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      variant={variant}
      className={cn(
        "w-full justify-between rounded-lg font-medium transition",
        padding,
        // checked styling “on top” of the base variant
        checked
          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
          : "hover:border-primary/50",
        "data-[state=on]:bg-primary/10", // future-proof if you swap to <Toggle>
        className
      )}
    >
      <span className="capitalize">{label}</span>

      {/* Checkbox is purely visual; clicks go to the Button */}
      <Checkbox
        checked={checked}
        // prevent double handlers; button controls state
        onCheckedChange={() => {}}
        className={cn(
          "pointer-events-none", // visual only
          checked ? "border-primary bg-primary text-primary-foreground" : ""
        )}
      />
    </Button>
  );
}
