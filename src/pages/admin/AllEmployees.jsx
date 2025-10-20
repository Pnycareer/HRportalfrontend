// src/pages/AllEmployees.jsx
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import useEmployees from "@/hooks/useEmployees";
import EmployeesTable from "@/components/employees/EmployeesTable";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ROLES = ["superadmin", "admin", "hr", "employee"]; // <- add

export default function AllEmployees() {
  const { user } = useAuth();

  const {
    filtered,
    loading,
    // filters
    q, setQ,
    branch, setBranch, branches,
    dept, setDept, departments,
    // actions
    reload,
    deleteEmployee,
    updateEmployee,
    updateEmployeeRole,       // (you can delete this if no longer used elsewhere)
    setEmployeeApproval,
  } = useEmployees();

  // edit modal state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    fullName: "",
    email: "",
    department: "",
    joiningDate: "",
    role: "employee",       // <- add
  });

  function openEdit(u) {
    setEditing(u);
    setEditForm({
      fullName: u.fullName || "",
      email: u.email || "",
      department: u.department || "",
      joiningDate: u.joiningDate ? String(u.joiningDate).slice(0, 10) : "",
      role: u.role || "employee",     // <- add
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing?._id) return;
    setEditSaving(true);
    try {
      await updateEmployee(editing._id, {
        fullName: editForm.fullName,
        email: editForm.email,
        department: editForm.department,
        joiningDate: editForm.joiningDate || null,
        role: editForm.role,                // <- add
      });
      toast.success("Employee updated");
      setEditOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">All Employees</h1>
        <div className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user?.fullName}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, ID, email"
            className="max-w-sm"
          />
          <Button type="button" variant="secondary" onClick={() => setQ("")}>
            Clear
          </Button>
          <Button type="button" variant="outline" onClick={reload}>
            Reload
          </Button>
        </div>

        {/* Branch filter (drives departments) */}
        <div className="flex items-center gap-2">
          <Select
            value={branch}
            onValueChange={(val) => {
              setBranch(val);
              // setDept("all")
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b === "all" ? "All branches" : b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <EmployeesTable
          rows={filtered}
          onEdit={(u) => openEdit(u)}
          onDelete={(id) => deleteEmployee(id)}
          // 🚫 remove inline role changes in table
          // onChangeRole={(u, role) => updateEmployeeRole(u._id, role)}
          onApprove={(u) => setEmployeeApproval(u._id, true)}
          onReject={(u) => setEmployeeApproval(u._id, false)}
        />
      )}

      {/* Edit Employee Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, fullName: e.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, email: e.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Department</label>
              <Select
                value={editForm.department || ""}
                onValueChange={(val) =>
                  setEditForm((s) => ({ ...s, department: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter((d) => d !== "all")
                    .map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔥 Role moved into modal */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={editForm.role}
                onValueChange={(val) =>
                  setEditForm((s) => ({ ...s, role: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Joining Date</label>
              <Input
                type="date"
                value={editForm.joiningDate || ""}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, joiningDate: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
