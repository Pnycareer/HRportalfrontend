import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SelectItem } from "@/components/ui/select";
import { BLOOD_GROUPS } from "@/components/constants/bloodGroups";
import { DEPARTMENTS } from "@/components/constants/departments";
import { DESIGNATIONS } from "@/components/constants/designations";
import { CITIES, getBranchesForCity } from "@/components/constants/locations";
import OffDaysModal from "../models/OffDaysModal";
import DutyRosterModal from "../models/DutyRosterModal";

import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import CheckMarkToggle from "@/components/form/CheckMarkToggle";

const defaultRoles = ["superadmin", "admin", "hr", "employee"];

function ensureValidActiveRole(roles, activeRole) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  if (activeRole && roles.includes(activeRole)) return activeRole;
  return roles[0];
}
function strToDays(str) {
  if (!str) return [];
  return String(str).split(",").map((s) => s.trim()).filter(Boolean);
}
function daysToStr(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}

export default function EditEmployeeModal({
  open,
  onOpenChange,
  editForm,
  setEditForm,
  onSave,
  saving,
  rolesList = defaultRoles,
}) {
  const bloodGroupSelectValue = editForm.bloodGroup || "none";
  const [offDaysOpen, setOffDaysOpen] = React.useState(false);
  const [rosterOpen, setRosterOpen] = React.useState(false);

  // city → branches
  const [branches, setBranches] = React.useState(
    getBranchesForCity(editForm.city || "")
  );
  React.useEffect(() => {
    const next = getBranchesForCity(editForm.city || "");
    setBranches(next);
    if (editForm.branch && !next.includes(editForm.branch)) {
      setEditForm((s) => ({ ...s, branch: "" }));
    }
  }, [editForm.city]);

  const currentDays = React.useMemo(
    () => strToDays(editForm.officialOffDays),
    [editForm.officialOffDays]
  );
  const selectedRoles = React.useMemo(
    () => (Array.isArray(editForm.roles) ? editForm.roles : []),
    [editForm.roles]
  );
  const activeRoleValue = React.useMemo(
    () => ensureValidActiveRole(selectedRoles, editForm.activeRole) || "",
    [selectedRoles, editForm.activeRole]
  );

  const designationOptions = React.useMemo(() => {
    const set = new Set(DESIGNATIONS);
    if (editForm.designation && !set.has(editForm.designation)) set.add(editForm.designation);
    return Array.from(set);
  }, [editForm.designation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Bounded height + hidden overflow at the shell */}
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] p-0 overflow-hidden">
        {/* Make a column layout where the middle can scroll */}
        <div className="flex h-full max-h-[90vh] flex-col">
          {/* Header (sticky/non-scrolling) */}
          <DialogHeader className="flex-none border-b bg-muted/30 px-6 pb-4 pt-6">
            <DialogTitle className="text-xl font-semibold">Edit Employee</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update personal details, access, and payroll info in one place.
            </p>
            {selectedRoles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRoles.map((r) => (
                  <Badge key={r} variant="secondary" className="uppercase">
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>

          {/* Tabs wrapper (fixed tabs row + scrollable content) */}
          <Tabs defaultValue="profile" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Tabs list (non-scrolling) */}
            <div className="flex-none px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3 gap-2 rounded-2xl bg-muted p-1">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="work">Work & Access</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable area — this is the only element that scrolls */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4 scroll-area">
              {/* PROFILE */}
              <TabsContent value="profile">
                <div className="space-y-6">
                  <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Personal Identity
                      </h3>
                    </header>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InputField
                        label="Full Name"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm((s) => ({ ...s, fullName: e.target.value }))}
                        containerClassName="md:col-span-2"
                      />
                      <InputField
                        label="Email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                        containerClassName="md:col-span-2"
                      />
                      <InputField
                        label="Contact Number"
                        type="number"
                        placeholder="e.g. 0300-1234567"
                        value={editForm.contactNumber || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, contactNumber: e.target.value }))}
                      />
                      <InputField
                        label="Joining Date"
                        type="date"
                        value={editForm.joiningDate || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, joiningDate: e.target.value }))}
                      />
                    </div>
                  </section>

                  <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Schedule & Wellbeing
                      </h3>
                    </header>
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Duty roster */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Duty Roster</label>
                        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                          <span className="text-sm text-muted-foreground">
                            {editForm.dutyRoster || "Not set"}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setRosterOpen(true)}>
                            Configure
                          </Button>
                        </div>
                      </div>

                      {/* Blood group */}
                      <SelectField
                        label="Blood Group"
                        value={bloodGroupSelectValue}
                        onValueChange={(val) =>
                          setEditForm((s) => ({ ...s, bloodGroup: val === "none" ? "" : val }))
                        }
                      >
                        <SelectItem value="none">Not set</SelectItem>
                        {BLOOD_GROUPS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectField>
                    </div>

                    {/* Off days */}
                    <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentDays.length ? (
                          currentDays.map((day) => (
                            <Badge key={day} variant="outline">
                              {day}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No off days selected yet.</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                          onClick={() => setOffDaysOpen(true)}
                        >
                          Configure Off Days
                        </Button>
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>

              {/* WORK */}
              <TabsContent value="work">
                <div className="space-y-6">
                  <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Org Placement
                      </h3>
                    </header>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Department"
                        value={editForm.department || "none"}
                        onValueChange={(val) =>
                          setEditForm((s) => ({ ...s, department: val === "none" ? "" : val }))
                        }
                      >
                        <SelectItem value="none">Not set</SelectItem>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectField>

                      <SelectField
                        label="Designation"
                        value={editForm.designation || "none"}
                        onValueChange={(val) => setEditForm((s) => ({ ...s, designation: val }))}
                      >
                        <SelectItem value="none">Not set</SelectItem>
                        {designationOptions.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectField>

                      <SelectField
                        label="City"
                        value={editForm.city || "none"}
                        onValueChange={(val) =>
                          setEditForm((s) => ({ ...s, city: val === "none" ? "" : val }))
                        }
                      >
                        <SelectItem value="none">Not set</SelectItem>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectField>

                      <SelectField
                        label="Branch"
                        value={editForm.branch || "none"}
                        disabled={!editForm.city}
                        onValueChange={(val) =>
                          setEditForm((s) => ({ ...s, branch: val === "none" ? "" : val }))
                        }
                      >
                        <SelectItem value="none">Not set</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectField>
                    </div>
                  </section>

                  {/* Roles */}
                  <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Role Assignments
                      </h3>
                    </header>
                    <div className="grid gap-3 md:grid-cols-2">
                      {rolesList.map((role) => {
                        const checked = selectedRoles.includes(role);
                        return (
                          <CheckMarkToggle
                            key={role}
                            label={role}
                            checked={checked}
                            onChange={(checkedVal) => {
                              const next = checkedVal
                                ? Array.from(new Set([...selectedRoles, role]))
                                : selectedRoles.filter((x) => x !== role);
                              const nextActive = ensureValidActiveRole(next, editForm.activeRole);
                              setEditForm((s) => ({ ...s, roles: next, activeRole: nextActive }));
                            }}
                          />
                        );
                      })}
                    </div>

                    <SelectField
                      label="Default Portal"
                      value={activeRoleValue}
                      onValueChange={(val) => setEditForm((s) => ({ ...s, activeRole: val }))}
                    >
                      {selectedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectField>
                  </section>
                </div>
              </TabsContent>

              {/* COMPENSATION */}
              <TabsContent value="compensation">
                <div className="space-y-6">
                  <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Salary & Banking
                      </h3>
                    </header>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InputField
                        label="Salary"
                        type="number"
                        min={0}
                        value={editForm.salary}
                        onChange={(e) => setEditForm((s) => ({ ...s, salary: e.target.value }))}
                        description="Leave blank to clear salary."
                      />
                      <InputField
                        label="Bank Account No"
                        value={editForm.bankAccountNo || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, bankAccountNo: e.target.value }))}
                      />
                      <InputField
                        label="Account Title"
                        value={editForm.bankAccountTitle || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, bankAccountTitle: e.target.value }))}
                      />
                      <InputField
                        label="Branch Code"
                        value={editForm.bankBranchCode || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, bankBranchCode: e.target.value }))}
                      />
                    </div>
                  </section>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer (non-scrolling) */}
          <DialogFooter className="flex-none border-t px-6 py-4">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>

      {/* Off Days */}
      <OffDaysModal
        open={offDaysOpen}
        onOpenChange={setOffDaysOpen}
        initialDays={currentDays}
        onSave={(days) => setEditForm((s) => ({ ...s, officialOffDays: daysToStr(days) }))}
      />

      {/* Duty Roster */}
      <DutyRosterModal
        open={rosterOpen}
        onOpenChange={setRosterOpen}
        initialRoster={editForm.dutyRoster}
        onSave={(formatted) => setEditForm((s) => ({ ...s, dutyRoster: formatted }))}
      />
    </Dialog>
  );
}
