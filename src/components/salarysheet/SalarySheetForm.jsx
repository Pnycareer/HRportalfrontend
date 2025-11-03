import React, { useMemo, useState, useEffect } from "react";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import useSalarySheet from "@/hooks/useSalarySheet";
import UserPicker from "@/components/userpicker/UserPicker";
import api from "@/lib/axios";

const EMPLOYEE_STATUSES = ["active", "probation", "resigned", "terminated", "inactive"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// number-safe
const toNum = (v) => (v === "" || v == null ? 0 : Number.isNaN(Number(v)) ? 0 : Number(v));

// days in month (month = 1..12)
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// first weekday of month (0=Sun..6=Sat)
function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

// clamp a date range to current month and return a Set of day numbers (1..31)
function rangeToDaysInMonth(fromISO, toISO, year, month) {
  const set = new Set();
  if (!fromISO || !toISO) return set;

  const from = new Date(fromISO);
  const to = new Date(toISO);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return set;

  // month boundaries (local)
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const s = from < start ? start : from;
  const e = to > end ? end : to;

  if (e < s) return set;

  // walk day-by-day
  const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const last = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  while (cur <= last) {
    if (cur.getFullYear() === year && cur.getMonth() === month - 1) {
      set.add(cur.getDate());
    }
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}

// count official off days inside a given month
function countOffDaysInMonth(year, month, offDays = []) {
  if (!year || !month) return 0;
  const total = daysInMonth(year, month);
  const offLower = new Set(
    (Array.isArray(offDays) ? offDays : []).map((d) => String(d).trim().toLowerCase())
  );
  let count = 0;
  for (let d = 1; d <= total; d++) {
    const weekdayIdx = new Date(year, month - 1, d).getDay();
    if (offLower.has(DAY_NAMES[weekdayIdx].toLowerCase())) count++;
  }
  return count;
}

// color priority resolver (highest first)
function resolveColor(existing, incoming) {
  const rank = { blue: 3, pink: 2, yellow: 1, undefined: 0 };
  return (rank[incoming] || 0) > (rank[existing] || 0) ? incoming : existing;
}

// 📅 calendar with:
// - Official Off (red)
// - Accepted (yellow)
// - Short+Accepted (blue)
// - Half-day first day (pink)
// (green removed)
function CalendarPreview({ year, month, offDays = [], leaveDaysSet }) {
  if (!year || !month) return null;

  const total = daysInMonth(year, month);
  const start = firstWeekday(year, month);

  const offLower = new Set(
    (Array.isArray(offDays) ? offDays : []).map((d) => String(d).trim().toLowerCase())
  );

  const cells = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-3 rounded-lg border shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="text-sm font-medium">{monthLabel}</div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-yellow-100 ring-1 ring-yellow-300" /> Accepted Leave
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-blue-100 ring-1 ring-blue-300" /> Short (Accepted)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-pink-100 ring-1 ring-pink-300" /> Half-day (Start)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-300" /> Official Off
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} className="bg-muted px-2 py-1 text-center font-medium">
            {w}
          </div>
        ))}

        {rows.map((week, ridx) => (
          <React.Fragment key={ridx}>
            {week.map((d, i) => {
              if (d === null) return <div key={i} className="bg-background min-h-10" />;
              const weekdayIdx = new Date(year, month - 1, d).getDay();
              const isOff = offLower.has(DAY_NAMES[weekdayIdx].toLowerCase());

              // fetch color tag from Map: "blue" | "pink" | "yellow" | undefined
              const leaveColor = leaveDaysSet?.get?.(d);

              let cls = "bg-background";
              if (leaveColor === "blue") {
                cls = "bg-blue-100 text-blue-900 ring-1 ring-blue-300 font-semibold";
              } else if (leaveColor === "pink") {
                cls = "bg-pink-100 text-pink-900 ring-1 ring-pink-300 font-semibold";
              } else if (leaveColor === "yellow") {
                cls = "bg-yellow-100 text-yellow-900 ring-1 ring-yellow-300 font-semibold";
              } else if (isOff) {
                cls = "bg-red-100 text-red-700 ring-1 ring-red-300 font-semibold";
              }

              return (
                <div key={i} className={`min-h-10 px-2 py-2 text-center ${cls}`}>
                  {d}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function SalarySheetForm({ onCreated }) {
  const { createSalarySheet, loading, error, data, setError, setData } = useSalarySheet();

  const now = new Date();
  const initialMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [userOffDays, setUserOffDays] = useState([]);
  // days Map: day (1..31) -> "yellow" | "blue" | "pink"
  const [leaveDaysSet, setLeaveDaysSet] = useState(new Map());

  const [form, setForm] = useState({
    userId: "",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    totalDays: daysInMonth(now.getFullYear(), now.getMonth() + 1),
    totalWorkingDays: 26,

    employeeStatus: "active",
    leavingDate: "",

    bankAccountNo: "",
    bankAccountTitle: "",
    bankBranchCode: "",

    basicSalary: "",
    utilities: "",
    previousMonthOmission: "",
    extraDaysWorked: "",
    overtimeAllDays: "",
    mobileAllowance: "",
    mealAllowance: "",
    otherOvertimeAllHours: "",
    ontimeIncentive: "",
    conveyanceTaDa: "",

    annualIncomeTax: "",
    incomeTax: "",

    fine: "",
    loanDeduction: "",
    degreeDeduction: "",
    advance: "",

    arrearsPreviousPayableSalary: "",
    salaryPayable: "",

    paymentInMonthOf: "",
    paymentDate: "",
    bank: "",
    cheque: "",
    closingPayable: "",
    remarks: "",
  });

  const [monthInput, setMonthInput] = useState(initialMonthValue);
  const [workingDaysTouched, setWorkingDaysTouched] = useState(false);

  // recalc totalDays when year/month changes
  useEffect(() => {
    if (!form.year || !form.month) return;
    const td = daysInMonth(form.year, form.month);
    setForm((s) => ({ ...s, totalDays: td }));
  }, [form.year, form.month]);

  // auto-calc totalWorkingDays based on official off (unless user has edited it)
  useEffect(() => {
    if (!form.year || !form.month) return;
    if (workingDaysTouched) return;

    const offCount = countOffDaysInMonth(form.year, form.month, userOffDays);
    const autoWorking = Math.max(0, toNum(form.totalDays) - offCount);

    setForm((s) => (s.totalWorkingDays === autoWorking ? s : { ...s, totalWorkingDays: autoWorking }));
  }, [form.year, form.month, form.totalDays, userOffDays, workingDaysTouched]);

  // setter
  const set = (name) => (e) => {
    const val = e?.target ? e.target.value : e;
    if (name === "totalWorkingDays") setWorkingDaysTouched(true);
    setForm((s) => ({ ...s, [name]: val }));
    if (error) setError(null);
  };

  const numericFields = useMemo(
    () => [
      "basicSalary",
      "utilities",
      "previousMonthOmission",
      "extraDaysWorked",
      "overtimeAllDays",
      "mobileAllowance",
      "mealAllowance",
      "otherOvertimeAllHours",
      "ontimeIncentive",
      "conveyanceTaDa",
      "annualIncomeTax",
      "incomeTax",
      "fine",
      "loanDeduction",
      "degreeDeduction",
      "advance",
      "arrearsPreviousPayableSalary",
      "salaryPayable",
      "closingPayable",
      "year",
      "month",
      "totalDays",
      "totalWorkingDays",
    ],
    []
  );

  // fetch accepted leaves for selected user + year/month
  useEffect(() => {
    async function loadLeaves() {
      setLeaveDaysSet(new Map());
      if (!form.userId || !form.year || !form.month) return;
      try {
        const { data } = await api.get("/api/leaves/report/monthly", {
          params: { userId: form.userId, year: form.year, month: form.month },
        });

        const entries = Array.isArray(data?.entries) ? data.entries : [];
        const acc = new Map();

        for (const item of entries) {
          if (item.status !== "accepted") continue;

          const days = Array.from(
            rangeToDaysInMonth(item.fromDate, item.toDate, form.year, form.month)
          ).sort((a, b) => a - b);

          if (item.leaveType === "short") {
            // short -> all blue
            for (const d of days) acc.set(d, resolveColor(acc.get(d), "blue"));
          } else if (item.leaveType === "half") {
            // half -> first day pink, remaining treated as accepted (yellow)
            if (days.length > 0) {
              acc.set(days[0], resolveColor(acc.get(days[0]), "pink"));
              for (let i = 1; i < days.length; i++) {
                acc.set(days[i], resolveColor(acc.get(days[i]), "yellow"));
              }
            }
          } else {
            // other accepted -> yellow
            for (const d of days) acc.set(d, resolveColor(acc.get(d), "yellow"));
          }
        }

        setLeaveDaysSet(acc);
      } catch (_) {
        setLeaveDaysSet(new Map());
      }
    }
    loadLeaves();
  }, [form.userId, form.year, form.month]);

  const handleUserChange = (u) => {
    const nextSalary = u && Number.isFinite(Number(u.salary)) ? Number(u.salary) : "";
    const bankAccountNo = u?.bankAccountNo ?? "";
    const bankAccountTitle =
      (u?.bankAccountTitle && u.bankAccountTitle.trim()) || (u?.fullName || "");
    const bankBranchCode = u?.bankBranchCode ?? "";

    const offDays = Array.isArray(u?.officialOffDays)
      ? u.officialOffDays.map((d) => String(d).trim())
      : [];
    setUserOffDays(offDays);

    setForm((s) => ({
      ...s,
      basicSalary: nextSalary,
      bankAccountNo,
      bankAccountTitle,
      bankBranchCode,
    }));
  };

  // submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId) return setError("userId is required");
    if (!form.year || !form.month) return setError("year and month are required");

    const payload = { ...form };
    numericFields.forEach((k) => (payload[k] = toNum(form[k])));
    if (!payload.leavingDate) delete payload.leavingDate;
    if (!payload.paymentDate) delete payload.paymentDate;

    try {
      const created = await createSalarySheet(payload);
      if (onCreated) onCreated(created);
      setData(created);
    } catch (_) {}
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* user picker */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Select User</h3>
        <UserPicker
          value={form.userId}
          onChange={(val) => setForm((s) => ({ ...s, userId: val }))}
          onUserChange={handleUserChange}
        />
      </section>

      {/* period */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payroll Month</label>
            <input
              type="month"
              className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none"
              value={monthInput}
              onChange={(e) => {
                const val = e.target.value; // "YYYY-MM"
                setMonthInput(val);
                const [yy, mm] = val.split("-").map((x) => Number(x));
                if (Number.isFinite(yy) && Number.isFinite(mm)) {
                  setForm((s) => ({ ...s, year: yy, month: mm }));
                }
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Picking a month auto-calculates <strong>Total Days</strong> and (unless you edit)
              <strong> Total Working Days</strong> based on official off days.
            </p>
          </div>

          <InputField
            label="Total Days"
            name="totalDays"
            type="number"
            value={form.totalDays}
            onChange={(e) => {
              setForm((s) => ({ ...s, totalDays: e?.target ? e.target.value : e }));
              if (error) setError(null);
            }}
            required
          />

          <InputField
            label="Total Working Days"
            name="totalWorkingDays"
            type="number"
            value={form.totalWorkingDays}
            onChange={set("totalWorkingDays")}
            required
          />
        </div>

        <CalendarPreview
          year={form.year}
          month={form.month}
          offDays={userOffDays}
          leaveDaysSet={leaveDaysSet}
        />
      </section>

      {/* employment */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Employment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SelectField
            label="Employee Status"
            name="employeeStatus"
            value={form.employeeStatus}
            onValueChange={(v) => setForm((s) => ({ ...s, employeeStatus: v }))}
          >
            {EMPLOYEE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectField>
          <InputField
            label="Leaving Date"
            name="leavingDate"
            type="date"
            value={form.leavingDate}
            onChange={set("leavingDate")}
            description="Only if applicable"
          />
        </div>
      </section>

      {/* bank */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Bank Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputField label="Account No" name="bankAccountNo" value={form.bankAccountNo} onChange={set("bankAccountNo")} />
          <InputField label="Account Title" name="bankAccountTitle" value={form.bankAccountTitle} onChange={set("bankAccountTitle")} />
          <InputField label="Branch Code" name="bankBranchCode" value={form.bankBranchCode} onChange={set("bankBranchCode")} />
        </div>
      </section>

      {/* earnings */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Earnings & Allowances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            "basicSalary",
            "utilities",
            "previousMonthOmission",
            "extraDaysWorked",
            "overtimeAllDays",
            "mobileAllowance",
            "mealAllowance",
            "otherOvertimeAllHours",
            "ontimeIncentive",
            "conveyanceTaDa",
          ].map((field) => (
            <InputField
              key={field}
              label={field.replace(/([A-Z])/g, " $1")}
              name={field}
              type="number"
              value={form[field]}
              onChange={set(field)}
            />
          ))}
        </div>
      </section>

      {/* taxes + deductions */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Taxes & Deductions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {["incomeTax", "annualIncomeTax", "fine", "loanDeduction", "degreeDeduction", "advance"].map(
            (field) => (
              <InputField
                key={field}
                label={field.replace(/([A-Z])/g, " $1")}
                name={field}
                type="number"
                value={form[field]}
                onChange={set(field)}
              />
            )
          )}
        </div>
      </section>

      {/* payables + payment */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Payables & Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            "arrearsPreviousPayableSalary",
            "salaryPayable",
            "paymentInMonthOf",
            "paymentDate",
            "bank",
            "cheque",
            "closingPayable",
            "remarks",
          ].map((field) => (
            <InputField
              key={field}
              label={field.replace(/([A-Z])/g, " $1")}
              name={field}
              value={form[field]}
              onChange={set(field)}
              type={field.toLowerCase().includes("date") ? "date" : "text"}
            />
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Create Salary Sheet"}
        </Button>
      </div>
    </form>
  );
}
