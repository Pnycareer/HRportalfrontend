import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function OffDaysModal({
  open,
  onOpenChange,
  title = "Official off days",
  initialDays = [],  // array of names
  onSave,            // (daysArray) => void
}) {
  const [days, setDays] = React.useState([]);

  React.useEffect(() => {
    if (open) setDays(Array.isArray(initialDays) ? initialDays.slice() : []);
  }, [open, initialDays]);

  function toggle(day) {
    setDays((prev) => (
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    ));
  }

  const handleSave = () => {
    const sorted = [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    onSave?.(sorted);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const checked = days.includes(d);
            return (
              <label
                key={d}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${checked ? "border-primary" : ""}`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(d)} />
                <span>{d}</span>
              </label>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
