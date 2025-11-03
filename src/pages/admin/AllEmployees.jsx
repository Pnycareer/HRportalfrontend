﻿import React from "react";
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
import EditEmployeeModal from "@/components/employees/EditEmployeeModal";
import { DEPARTMENTS } from "@/components/constants/departments";
import { CITIES, getBranchesForCity } from "@/components/constants/locations";

const ROLES = ["superadmin", "admin", "hr", "employee"];

// keep activeRole valid against roles
function ensureValidActiveRole(roles, activeRole) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  if (activeRole && roles.includes(activeRole)) return activeRole;
  return roles[0];
}

export default function AllEmployees() {
  const { user } = useAuth();

  const {
    filtered,
    loading,
    // filters
    q,
    setQ,
    branch,
    setBranch,
    dept,
    setDept,
    // actions
    reload,
    deleteEmployee,
    updateEmployee,
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
    roles: ["employee"],
    activeRole: "employee",
    designation: "",
    dutyRoster: "10am to 7pm",
    officialOffDays: "",
    bloodGroup: "",
    contactNumber: "",
    branch: "",
    city: "",
    salary: "",
    bankAccountNo: "",
    bankAccountTitle: "",
    bankBranchCode: "",
  });

  // city filter (to drive branch list)
  const [city, setCity] = React.useState("Lahore");
  const [branches, setBranches] = React.useState(getBranchesForCity(city));

  React.useEffect(() => {
    setBranches(getBranchesForCity(city));
    setBranch("all");
  }, [city]);

  function openEdit(u) {
    const roles =
      Array.isArray(u.roles) && u.roles.length
        ? u.roles
        : u.role
        ? [u.role]
        : ["employee"];
    const activeRole = ensureValidActiveRole(roles, u.activeRole || u.role);

    setEditing(u);
    setEditForm({
      fullName: u.fullName || "",
      email: u.email || "",
      department: u.department || "",
      joiningDate: u.joiningDate ? String(u.joiningDate).slice(0, 10) : "",
      roles,
      activeRole,
      designation: u.designation || "",
      dutyRoster: u.dutyRoster || "10am to 7pm",
      officialOffDays: Array.isArray(u.officialOffDays)
        ? u.officialOffDays.join(", ")
        : u.officialOffDays || "",
      bloodGroup: u.bloodGroup || "",
      contactNumber: u.contactNumber || "",
      branch: u.branch || "",
      city: u.city || city,
      salary: (u.salary ?? "") === null ? "" : String(u.salary),
      bankAccountNo: u.bankAccountNo || "",
      bankAccountTitle: u.bankAccountTitle || "",
      bankBranchCode: u.bankBranchCode || "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editing?._id) return;
    setEditSaving(true);
    try {
      const cleanedRoles = Array.isArray(editForm.roles)
        ? Array.from(new Set(editForm.roles.filter(Boolean)))
        : ["employee"];
      const cleanedActiveRole = ensureValidActiveRole(
        cleanedRoles,
        editForm.activeRole
      );

      await updateEmployee(editing._id, {
        fullName: editForm.fullName,
        email: editForm.email,
        department: editForm.department,
        joiningDate: editForm.joiningDate || null,
        roles: cleanedRoles,
        activeRole: cleanedActiveRole,
        designation: editForm.designation,
        dutyRoster: editForm.dutyRoster,
        officialOffDays: editForm.officialOffDays,
        bloodGroup: editForm.bloodGroup,
        contactNumber: editForm.contactNumber,
        branch: editForm.branch,
        city: editForm.city,
        salary: editForm.salary === "" ? null : Number(editForm.salary),
        bankAccountNo: editForm.bankAccountNo,
        bankAccountTitle: editForm.bankAccountTitle,
        bankBranchCode: editForm.bankBranchCode,
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
      {/* Header */}
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

        <div className="flex flex-wrap items-center gap-2">
          {/* City Filter */}
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch Filter (depends on city) */}
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department Filter */}
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-background">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="max-h-[calc(100vh-260px)] overflow-auto">
            <EmployeesTable
              rows={filtered}
              onEdit={(u) => openEdit(u)}
              onDelete={(id) => deleteEmployee(id)}
              onApprove={(u) => setEmployeeApproval(u._id, true)}
              onReject={(u) => setEmployeeApproval(u._id, false)}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditEmployeeModal
        open={editOpen}
        onOpenChange={setEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        rolesList={ROLES}
        onSave={saveEdit}
        saving={editSaving}
      />
    </div>
  );
}
