import React from "react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function useEmployees() {
  const [employees, setEmployees] = React.useState([]);
  const [filtered, setFiltered] = React.useState([]);

  // filters
  const [q, setQ] = React.useState("");
  const [branch, setBranch] = React.useState("all");
  const [dept, setDept] = React.useState("all");

  const [loading, setLoading] = React.useState(true);

  // normalize server user just to ensure _id always exists
  function normalizeServerUser(u) {
    if (!u) return u;
    const _id = u._id || u.id;
    return { ...u, _id };
  }

  // patch a user locally without refetch
  function patchLocal(id, patch) {
    setEmployees((prev) =>
      prev.map((u) => (u._id === id ? { ...u, ...patch } : u))
    );
    setFiltered((prev) =>
      prev.map((u) => (u._id === id ? { ...u, ...patch } : u))
    );
  }

  // fetch employees
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users");
      const list = Array.isArray(data) ? data.map(normalizeServerUser) : [];
      setEmployees(list);
      setFiltered(list);
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

  React.useEffect(() => {
    load();
  }, [load]);

  // filtering logic (by branch, dept, and search query)
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

      const hay = [
        u.fullName,
        u.employeeId,
        u.email,
        u.department,
        u.designation,
        u.role,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return hay.some((v) => v.includes(s));
    });

    setFiltered(next);
  }, [q, branch, dept, employees]);

  // ====== Admin Actions ======

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
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete employee"
      );
    }
  }

  async function updateEmployee(id, payload, opts = {}) {
    const before = employees.find((u) => u._id === id);
    patchLocal(id, payload);
    try {
      const { data } = await api.patch(`/api/users/edit/${id}`, payload);
      const srv = normalizeServerUser(data?.user) || payload;
      patchLocal(id, srv);
      if (!opts.silent) toast.success("Updated");
    } catch (err) {
      if (before) patchLocal(id, before);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update employee"
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
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update role"
      );
    }
  }

  async function updateEmployeeSalary(id, salary, opts = {}) {
    let num = null;
    if (salary !== null && salary !== "") {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(
          "Salary must be a non-negative number (or leave blank to clear)."
        );
        throw new Error("invalid-salary");
      }
      num = Math.round(n * 100) / 100;
    }

    const before = employees.find((u) => u._id === id);
    patchLocal(id, { salary: num });
    try {
      const { data } = await api.patch(`/api/users/edit/${id}`, { salary: num });
      const srv = normalizeServerUser(data?.user);
      if (srv) patchLocal(id, srv);
      if (!opts.silent) toast.success("Salary updated");
    } catch (err) {
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
    employees,
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
    reload: load,
    deleteEmployee,
    updateEmployee,
    updateEmployeeRole,
    setEmployeeApproval,
    updateEmployeeSalary,
  };
}
