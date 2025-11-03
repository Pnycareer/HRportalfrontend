import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// options
const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["am", "pm"];

// parse "10am to 7pm" / "10:00am to 07:00pm"
function parseDutyRoster(text) {
  if (!text) return null;
  const s = String(text).trim().toLowerCase().replace(/\s*-\s*/g, " to ");
  const m = s.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)\s*to\s*(\d{1,2}):?(\d{2})?\s*(am|pm)/);
  if (!m) return null;
  const [, sh, smRaw, sp, eh, emRaw, ep] = m;
  const sm = String(parseInt(smRaw ?? "00", 10)).padStart(2, "0");
  const em = String(parseInt(emRaw ?? "00", 10)).padStart(2, "0");
  return {
    sh: String(Math.max(1, Math.min(12, +sh))).padStart(2, "0"),
    sm, sp,
    eh: String(Math.max(1, Math.min(12, +eh))).padStart(2, "0"),
    em, ep,
    overnight: false,
  };
}

function to24m(h, m, p) {
  let hh = (+h % 12);
  if (p === "pm") hh += 12;
  return hh * 60 + (+m);
}

function formatDuty({ sh, sm, sp, eh, em, ep }) {
  // drop leading zero in hour (10 -> 10, 09 -> 9)
  const sH = String(parseInt(sh, 10));
  const eH = String(parseInt(eh, 10));
  return `${sH}:${sm}${sp} to ${eH}:${em}${ep}`;
}

export default function DutyRosterModal({
  open,
  onOpenChange,
  title = "Duty roster",
  initialRoster,        // string, e.g. "10:00am to 07:00pm"
  onSave,               // (formattedString) => void
}) {
  const [state, setState] = React.useState({
    sh: "09", sm: "00", sp: "am",
    eh: "05", em: "00", ep: "pm",
    overnight: false,
  });

  React.useEffect(() => {
    // when opened, hydrate from initialRoster
    if (open) {
      const parsed = parseDutyRoster(initialRoster) || {
        sh: "09", sm: "00", sp: "am",
        eh: "05", em: "00", ep: "pm",
        overnight: false,
      };
      setState(parsed);
    }
  }, [open, initialRoster]);

  function validate() {
    const start = to24m(state.sh, state.sm, state.sp);
    let end = to24m(state.eh, state.em, state.ep);
    if (state.overnight) end += 24 * 60;
    if (end <= start) return false;
    return true;
  }

  const handleSave = () => {
    if (!validate()) {
      toast.error("End time must be after start. Turn on Overnight if it ends next day.");
      return;
    }
    const formatted = formatDuty(state);
    onSave?.(formatted);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Start */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Start</div>
              <div className="flex gap-2">
                <Select value={state.sh} onValueChange={(v) => setState((s) => ({ ...s, sh: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[84px] p-1">
                    {HOURS_12.map((h) => <SelectItem key={h} value={h} className="text-sm h-8 py-1.5">{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={state.sm} onValueChange={(v) => setState((s) => ({ ...s, sm: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[96px] p-1">
                    {MINUTES.map((m) => <SelectItem key={m} value={m} className="text-sm h-8 py-1.5">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={state.sp} onValueChange={(v) => setState((s) => ({ ...s, sp: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[84px] p-1">
                    {PERIODS.map((p) => <SelectItem key={p} value={p} className="text-sm h-8 py-1.5">{p.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* End */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">End</div>
              <div className="flex gap-2">
                <Select value={state.eh} onValueChange={(v) => setState((s) => ({ ...s, eh: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[84px] p-1">
                    {HOURS_12.map((h) => <SelectItem key={h} value={h} className="text-sm h-8 py-1.5">{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={state.em} onValueChange={(v) => setState((s) => ({ ...s, em: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[96px] p-1">
                    {MINUTES.map((m) => <SelectItem key={m} value={m} className="text-sm h-8 py-1.5">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={state.ep} onValueChange={(v) => setState((s) => ({ ...s, ep: v }))}>
                  <SelectTrigger className="h-9 w-[84px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[84px] p-1">
                    {PERIODS.map((p) => <SelectItem key={p} value={p} className="text-sm h-8 py-1.5">{p.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!state.overnight}
              onCheckedChange={(v) => setState((s) => ({ ...s, overnight: !!v }))}
            />
            Overnight (ends next day)
          </label> */}
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
