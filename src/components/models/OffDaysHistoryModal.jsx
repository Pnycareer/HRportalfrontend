import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function OffDaysHistoryModal({ open, onOpenChange, history = [] }) {
  const items = Array.isArray(history) ? [...history] : [];
  // newest first
  items.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Official Off-Days History</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No changes recorded.</p>
          )}

          {items.map((entry, idx) => {
            const when = entry.changedAt ? new Date(entry.changedAt) : null;
            const who =
              entry.changedBy?.fullName ||
              entry.changedBy?.name ||
              entry.changedBy?.email ||
              null;

            return (
              <div
                key={idx}
                className="rounded-lg border p-3 bg-muted/20 text-sm space-y-2"
              >
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{when ? when.toLocaleString() : "—"}</span>
                  <span>{who ? `by ${who}` : ""}</span>
                </div>

                <div>
                  <span className="font-medium">Previous:</span>{" "}
                  {Array.isArray(entry.previous) && entry.previous.length ? (
                    entry.previous.map((d) => (
                      <Badge key={d} variant="outline" className="mx-1">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    "—"
                  )}
                </div>

                <div>
                  <span className="font-medium">New:</span>{" "}
                  {Array.isArray(entry.next) && entry.next.length ? (
                    entry.next.map((d) => (
                      <Badge key={d} variant="secondary" className="mx-1">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
