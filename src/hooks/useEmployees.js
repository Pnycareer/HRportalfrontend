import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

/**
 * useEmployees
 * - Fetches users (employees)
 * - Branch-aware filtering (branch -> department -> search)
 * - Builds branch list and branch-scoped department list
 * - Admin actions: approve/reject via single update, delete, edit, role, salary
 */
export default function useEmployees() {
  const [employees, setEmployees] = React.useState([]);
  const [filtered, setFiltered] = React.useState([]);

  // filters
  const [q, setQ] = React.useState("");
  const [branch, setBranch] = React.useState("all");
  const [dept, setDept] = React.useState("all");

  // options
  const [branches, setBranches] = React.useState(["all"]);
  const [departments, setDepartments] = React.useState(["all"]);

  const [loading, setLoading] = React.useState(true);

  // normalize server payloads from /edit/:id (user.id -> _id)
  function normalizeServerUser(u) {
    if (!u) return u;
    const _id = u._id || u.id;
    return { ...u, _id };
  }

  // local patch helper
  function patchLocal(id, patch) {
    setEmployees((prev) =>
      prev.map((u) => (u._id === id ? { ...u, ...patch } : u))
    );
    setFiltered((prev) =>
      prev.map((u) => (u._id === id ? { ...u, ...patch } : u))
    );
  }

  // fetch users
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users");
      const list = Array.isArray(data) ? data.map(normalizeServerUser) : [];
      setEmployees(list);
      setFiltered(list);

      // build branches (case-insensitive), sorted
      const uniqueBranches = Array.from(
        new Set(
          list.map((u) => (u.branch || "").trim().toLowerCase()).filter(Boolean)
        )
      )
        .map((b) => b.charAt(0).toUpperCase() + b.slice(1))
        .sort((a, b) => a.localeCompare(b));
      setBranches(["all", ...uniqueBranches]);

      // initial departments = all departments across all branches
      const uniqueDepts = Array.from(
        new Set(
          list
            .map((u) => (u.department || "").trim().toLowerCase())
            .filter(Boolean)
        )
      )
        .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
        .sort((a, b) => a.localeCompare(b));
      setDepartments(["all", ...uniqueDepts]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch employees"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // when branch changes, recompute departments limited to that branch
  React.useEffect(() => {
    const pool =
      branch === "all"
        ? employees
        : employees.filter(
            (u) => String(u.branch || "").toLowerCase() === branch.toLowerCase()
          );

    const branchDepts = Array.from(
      new Set(
        pool
          .map((u) => (u.department || "").trim().toLowerCase())
          .filter(Boolean)
      )
    )
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
      .sort((a, b) => a.localeCompare(b));

    setDepartments(["all", ...branchDepts]);

    // reset dept if it's not available in the new list
    if (dept !== "all" && !branchDepts.includes(dept)) {
      setDept("all");
    }
  }, [branch, employees]); // eslint-disable-line react-hooks/exhaustive-deps

  // filtering (branch -> dept -> search)
  React.useEffect(() => {
    const s = q.trim().toLowerCase();

    const next = employees.filter((u) => {
      const matchesBranch =
        branch === "all"
          ? true
          : String(u.branch || "").toLowerCase() === branch.toLowerCase();
      if (!matchesBranch) return false;

      const matchesDept =
        dept === "all"
          ? true
          : String(u.department || "").toLowerCase() === dept.toLowerCase();
      if (!matchesDept) return false;

      if (!s) return true;

      const hay = [u.fullName, u.employeeId, u.email, u.department, u.role]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return hay.some((v) => v.includes(s));
    });

    setFiltered(next);
  }, [q, branch, dept, employees]);

  // ===== Admin actions (employee=user) =====
  async function setEmployeeApproval(id, isApproved) {
    const before = employees.find((u) => u._id === id);
    patchLocal(id, { isApproved });
    try {
      const { data } = await api.patch(`/api/users/edit/${id}`, { isApproved });
      const srv = normalizeServerUser(data?.user);
      if (srv) patchLocal(id, srv);
      toast.success(isApproved ? "Approved" : "Rejected");
    } catch (err) {
      patchLocal(id, { isApproved: before?.isApproved ?? false });
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update approval"
      );
    }
  }

  async function deleteEmployee(id) {
    const before = employees;
    setEmployees((prev) => prev.filter((u) => u._id !== id));
    setFiltered((prev) => prev.filter((u) => u._id !== id));
    try {
      await api.delete(`/api/users/${id}`);
      toast.success("Deleted");
    } catch (err) {
      setEmployees(before);
      setFiltered(before);
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to delete"
      );
    }
  }

 async function updateEmployee(id, payload, opts = {}) {
  const before = employees.find((u) => u._id === id);

  // optimistic update
  patchLocal(id, payload);

  try {
    const { data } = await api.patch(`/api/users/edit/${id}`, payload);
    const srv = normalizeServerUser(data?.user) || payload;
    patchLocal(id, srv);

    // ✅ only toast if not silenced
    if (!opts.silent) toast.success("Updated");
  } catch (err) {
    // revert local state
    if (before) patchLocal(id, before);
    toast.error(
      err?.response?.data?.message || err?.message || "Failed to update"
    );
    throw err;
  }
}


  async function updateEmployeeRole(id, role) {
    const before = employees.find((u) => u._id === id);
    patchLocal(id, { role });
    try {
      const { data } = await api.patch(`/api/users/edit/${id}`, { role });
      const srv = normalizeServerUser(data?.user);
      if (srv) patchLocal(id, srv);
      toast.success("Role updated");
    } catch (err) {
      patchLocal(id, { role: before?.role || "employee" });
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to update role"
      );
    }
  }

  // 👇 NEW: update salary (number or null to clear)
  async function updateEmployeeSalary(id, salary, opts = {}) {
    // accept number | string | null | ""
    let num = null;
    if (salary !== null && salary !== "") {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(
          "Salary must be a non-negative number (or leave blank to clear)."
        );
        throw new Error("invalid-salary");
      }
      // normalize to 2dp
      num = Math.round(n * 100) / 100;
    }

    const before = employees.find((u) => u._id === id);
    patchLocal(id, { salary: num });
    try {
      const { data } = await api.patch(`/api/users/edit/${id}`, {
        salary: num,
      });
      const srv = normalizeServerUser(data?.user);
      if (srv) patchLocal(id, srv);

      // 👇 only show toast if not silenced by caller
      if (!opts.silent) toast.success("Salary updated");
    } catch (err) {
      // revert
      patchLocal(id, { salary: before?.salary ?? null });
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update salary"
      );
      throw err;
    }
  }

  return {
    // state
    employees,
    filtered,
    loading,

    // filters + options
    q,
    setQ,
    branch,
    setBranch,
    branches,
    dept,
    setDept,
    departments,

    // actions
    reload: load,
    deleteEmployee,
    updateEmployee,
    updateEmployeeRole,
    setEmployeeApproval,
    updateEmployeeSalary, // 👈 expose it
  };
}
