import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  minutesToHuman,
  formatClockLabel,
  formatDateLabel,
  toMinutes,
  isoToDateInput,
  isoToHHmmUTC,
  createSlotId,
  makeInitialSlot,
  guessCityByBranch,
} from "@/utils/time";
import SlotsEditor from "../employee/SlotsEditor";
import { toast } from "sonner";

export default function ClaimsTable({
  claims = [],
  loading = false,
  saving = false,
  cityBranches,
  onUpdate, // (id, payload) => Promise<void>
  onDelete, // (id) => Promise<void>
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    date: "",
    city: "",
    branchName: "",
    notes: "",
  });
  const [editSlots, setEditSlots] = React.useState([]);

  const beginEdit = (claim) => {
    const dateInput = isoToDateInput(claim.date);
    const mappedSlots =
      Array.isArray(claim.overtimeSlots) && claim.overtimeSlots.length
        ? claim.overtimeSlots.map((s) => ({
            id: createSlotId(),
            start: isoToHHmmUTC(s.from),
            end: isoToHHmmUTC(s.to),
          }))
        : [makeInitialSlot()];

    const city = guessCityByBranch(claim.branchName, cityBranches);

    setEditingId(claim._id);
    setEditForm({
      date: dateInput,
      city,
      branchName: claim.branchName || "",
      notes: claim.notes || "",
    });
    setEditSlots(mappedSlots);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ date: "", city: "", branchName: "", notes: "" });
    setEditSlots([]);
  };

  const handleEditFormChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === "city") {
      const allowed = cityBranches[value] || [];
      if (!allowed.includes(editForm.branchName)) {
        setEditForm((prev2) => ({ ...prev2, branchName: "" }));
      }
    }
  };

  const handleEditSlotChange = (slotId, field, value) => {
    setEditSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleEditAddSlot = () =>
    setEditSlots((prev) => [...prev, makeInitialSlot()]);
  const handleEditRemoveSlot = (slotId) =>
    setEditSlots((prev) =>
      prev.length <= 1 ? prev : prev.filter((s) => s.id !== slotId)
    );

  const editTotalMinutes = React.useMemo(() => {
    return editSlots.reduce((sum, slot) => {
      const s = toMinutes(slot.start);
      const e = toMinutes(slot.end);
      if (s === null || e === null || e <= s) return sum;
      return sum + (e - s);
    }, 0);
  }, [editSlots]);

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.date) return toast.error("Pick a date.");
    if (!editForm.branchName) return toast.error("Pick a branch.");

    const preparedSlots = [];
    for (const slot of editSlots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null)
        return toast.error(
          "Please provide valid start and end times for each slot."
        );
      if (end <= start)
        return toast.error("Each overtime slot must end after it starts.");
      preparedSlots.push({ start: slot.start, end: slot.end });
    }

    try {
      await onUpdate(editingId, {
        date: editForm.date,
        branchName: editForm.branchName,
        notes: editForm.notes,
        overtimeSlots: preparedSlots,
      });
      cancelEdit();
    } catch {
      // handled upstream
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
    } catch {
      // handled upstream
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Past overtime claims
        </h3>
        {loading && (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      {claims.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No overtime submissions yet. Log your first slot above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Total time</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => {
                const isEditing = editingId === claim._id;
                return (
                  <React.Fragment key={claim._id}>
                    <TableRow>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDateLabel(claim.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.branchName || "--"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {minutesToHuman(claim.totalDurationMinutes)}
                      </TableCell>
                      <TableCell className="space-y-1">
                        {Array.isArray(claim.overtimeSlots) &&
                        claim.overtimeSlots.length > 0 ? (
                          claim.overtimeSlots.map((slot, index) => (
                            <div
                              key={`${claim._id}-slot-${index}`}
                              className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                            >
                              {formatClockLabel(slot.from)} to{" "}
                              {formatClockLabel(slot.to)} (
                              {minutesToHuman(slot.durationMinutes)})
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No slots found
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-normal">
                        {claim.notes?.trim() || "--"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.verified ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-600">
                            Pending review
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          {!isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => beginEdit(claim)}
                                disabled={saving}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleDelete(claim._id)}
                                disabled={saving}
                              >
                                Delete
                              </Button>
                            </>
                          ) : (
                            <div className="text-right text-xs text-muted-foreground">
                              Editing…
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {isEditing && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="rounded-lg border p-4 space-y-4 bg-background/50">
                            <div className="grid gap-4 md:grid-cols-4">
                              <div className="space-y-2">
                                <Label>Edit date</Label>
                                <Input
                                  type="date"
                                  value={editForm.date}
                                  onChange={handleEditFormChange("date")}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>City</Label>
                                <select
                                  value={editForm.city}
                                  onChange={handleEditFormChange("city")}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">Select city</option>
                                  {Object.keys(cityBranches).map((city) => (
                                    <option key={city} value={city}>
                                      {city}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Branch</Label>
                                <select
                                  value={editForm.branchName}
                                  onChange={handleEditFormChange("branchName")}
                                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                  <option value="">Select branch</option>
                                  {(cityBranches[editForm.city] || []).map(
                                    (branch) => (
                                      <option key={branch} value={branch}>
                                        {branch}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Total minutes</Label>
                                <Input
                                  readOnly
                                  value={minutesToHuman(editTotalMinutes)}
                                />
                              </div>
                            </div>

                            <SlotsEditor
                              slots={editSlots}
                              onChangeSlot={handleEditSlotChange}
                              onAddSlot={handleEditAddSlot}
                              onRemoveSlot={handleEditRemoveSlot}
                              title="Edit overtime slots"
                              description="Update time ranges as needed."
                            />

                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <textarea
                                value={editForm.notes}
                                onChange={handleEditFormChange("notes")}
                                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Notes for admin"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save changes"}
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
