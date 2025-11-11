import React, { useMemo, useState, useEffect } from "react";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import useSalarySheet from "@/hooks/useSalarySheet";
import UserPicker from "@/components/userpicker/UserPicker";
import api from "@/lib/axios";
import { toast } from "sonner";

const EMPLOYEE_STATUSES = ["active", "probation", "resigned", "terminated", "inactive"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BASIC_FROM_GROSS_RATE = 0.6667; // 66.67%
const MONTHS_PER_YEAR = 12;

function computeAnnualIncomeTax(amount = 0) {
  const income = Math.max(0, amount);
  if (income <= 600000) return 0;
  if (income <= 1200000) return (income - 600000) * 0.01;
  if (income <= 2200000) return 6000 + (income - 1200000) * 0.11;
  if (income <= 3200000) return 116000 + (income - 2200000) * 0.23;
  if (income <= 4100000) return 346000 + (income - 3200000) * 0.3;
  return 616000 + (income - 4100000) * 0.35;
}

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

    bankName: "",
    bankAccountNo: "",
    bankAccountTitle: "",
    bankBranchCode: "",

    grossSalary: "0",
    basicSalary: "0",
    utilities: "0",
    previousMonthOmission: "0",
    extraDaysWorked: "0",
    overtimeAllDays: "0",
    mobileAllowance: "0",
    mealAllowance: "0",
    otherOvertimeAllHours: "0",
    ontimeIncentive: "0",
    conveyanceTaDa: "0",

    incomeTax: "0",

    fine: "0",
    loanDeduction: "0",
    degreeDeduction: "0",
    advance: "0",

    arrearsPreviousPayableSalary: "0",

    paymentDate: "",
    bank: "",
    cheque: "0",
    closingPayable: "0",
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

  // keep basic + utilities in sync with gross salary
  useEffect(() => {
    const grossValue = Number(form.grossSalary);
    if (!Number.isFinite(grossValue)) {
      setForm((s) =>
        s.basicSalary === "0" && s.utilities === "0"
          ? s
          : { ...s, basicSalary: "0", utilities: "0" }
      );
      return;
    }

    const safeGross = Math.max(0, grossValue);
    const roundedBasic = Math.round(safeGross * BASIC_FROM_GROSS_RATE * 100) / 100;
    const roundedUtilities = Math.round((safeGross - roundedBasic) * 100) / 100;

    const basicStr = roundedBasic.toString();
    const utilitiesStr = roundedUtilities.toString();

    setForm((s) =>
      s.basicSalary === basicStr && s.utilities === utilitiesStr
        ? s
        : { ...s, basicSalary: basicStr, utilities: utilitiesStr }
    );
  }, [form.grossSalary]);

  const derivedTaxValues = useMemo(() => {
    const grossValue = Number(form.grossSalary);
    const safeGross = Number.isFinite(grossValue) ? Math.max(0, grossValue) : 0;
    const monthly = Math.round(safeGross * 100) / 100;
    const annualTaxable = Math.round(monthly * MONTHS_PER_YEAR * 100) / 100;
    const annualIncomeTax = Math.round(computeAnnualIncomeTax(annualTaxable) * 100) / 100;
    const monthlyIncomeTax = Math.round((annualIncomeTax / MONTHS_PER_YEAR) * 100) / 100;
    return { taxableMonthly: monthly, annualTaxable, annualIncomeTax, monthlyIncomeTax };
  }, [form.grossSalary]);

  const deductionSummary = useMemo(() => {
    const monthlyIncomeTaxValue = derivedTaxValues.monthlyIncomeTax;
    const advanceValue = toNum(form.advance);
    const total = Math.round((monthlyIncomeTaxValue + advanceValue) * 100) / 100;
    return {
      monthlyIncomeTaxValue,
      advanceValue,
      total,
      display: total.toString(),
    };
  }, [derivedTaxValues.monthlyIncomeTax, form.advance]);

  const netSalaryPayable = useMemo(() => {
    const taxableMonthly = derivedTaxValues.taxableMonthly;
    const deductionTotal = Number.isFinite(deductionSummary.total) ? deductionSummary.total : 0;
    const net = Math.max(0, Math.round((taxableMonthly - deductionTotal) * 100) / 100);
    return { value: net, display: net.toString() };
  }, [derivedTaxValues.taxableMonthly, deductionSummary.total]);

  const payrollMonthLabel = useMemo(() => {
    if (!form.year || !form.month) return "";
    const date = new Date(form.year, form.month - 1, 1);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", { month: "long" });
  }, [form.year, form.month]);

  const paymentInMonthSummary = useMemo(() => {
    const arrearsValue = toNum(form.arrearsPreviousPayableSalary);
    const netValue = netSalaryPayable.value;
    const total = Math.max(0, Math.round((netValue + arrearsValue) * 100) / 100);
    return {
      value: total,
      display: total.toString(),
      label: payrollMonthLabel
        ? `Payment in Month of ${payrollMonthLabel}`
        : "Payment in Month",
    };
  }, [form.arrearsPreviousPayableSalary, netSalaryPayable.value, payrollMonthLabel]);

  const numericFields = useMemo(
    () => [
      "grossSalary",
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
      "incomeTax",
      "fine",
      "loanDeduction",
        "degreeDeduction",
        "advance",
        "arrearsPreviousPayableSalary",
        "cheque",
        "closingPayable",
      "year",
      "month",
      "totalDays",
      "totalWorkingDays",
    ],
    []
  );

  const numericFieldSet = useMemo(
    () => new Set(numericFields),
    [numericFields]
  );

  // setter
  const set = (name) => (e) => {
    let val = e?.target ? e.target.value : e;
    if (typeof val === "number") val = val.toString();
    if (numericFieldSet.has(name)) {
      if (val == null || val === "") {
        val = "0";
      } else if (/^-?0[0-9]+/.test(val)) {
        const isNegative = val.startsWith("-");
        let trimmed = val.replace(/^-?0+/, "");
        if (trimmed.startsWith(".")) trimmed = `0${trimmed}`;
        const normalized = trimmed === "" ? "0" : trimmed;
        val = isNegative ? `-${normalized}` : normalized;
      }
    }
    if (name === "totalWorkingDays") setWorkingDaysTouched(true);
    setForm((s) => ({ ...s, [name]: val }));
    if (error) setError(null);
  };

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
    const nextSalary = u && Number.isFinite(Number(u.salary)) ? Number(u.salary) : 0;
    const nextGross = nextSalary.toString();
    const bankName = u?.bank ?? u?.bankName ?? "";
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
      grossSalary: nextGross,
      bank: bankName,
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
    payload.bankName = form.bank || "";
    const monthlyTaxable = Number.isFinite(payload.grossSalary)
      ? Math.max(0, payload.grossSalary)
      : 0;
    payload.taxableSalaryCurrentMonth = monthlyTaxable;
    payload.annualTaxableSalary =
      Math.round(monthlyTaxable * MONTHS_PER_YEAR * 100) / 100;
    payload.annualIncomeTax =
      Math.round(
        computeAnnualIncomeTax(payload.annualTaxableSalary) * 100
      ) / 100;
    payload.incomeTax =
      payload.annualIncomeTax > 0
        ? Math.round(
            (payload.annualIncomeTax / MONTHS_PER_YEAR) * 100
          ) / 100
        : 0;
    payload.totalDeduction = deductionSummary.total;
    payload.salaryPayable =
      netSalaryPayable.value == null ? 0 : netSalaryPayable.value;
    payload.paymentInMonthOf = payrollMonthLabel
      ? `${payrollMonthLabel}: ${paymentInMonthSummary.value}`
      : paymentInMonthSummary.value.toString();
    if (!payload.leavingDate) delete payload.leavingDate;
    if (!payload.paymentDate) delete payload.paymentDate;

    try {
      const created = await createSalarySheet(payload);
      if (onCreated) onCreated(created);
      setData(created);
      toast.success("Salary saved successfully");
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
            onChange={set("totalDays")}
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
          <InputField
            label="Bank Name"
            name="bank"
            value={form.bank}
            onChange={set("bank")}
            placeholder="Enter bank name"
          />
          <InputField label="Account No" name="bankAccountNo" value={form.bankAccountNo} onChange={set("bankAccountNo")} />
          <InputField label="Account Title" name="bankAccountTitle" value={form.bankAccountTitle} onChange={set("bankAccountTitle")} />
          <InputField label="Branch Code" name="bankBranchCode" value={form.bankBranchCode} onChange={set("bankBranchCode")} />
        </div>
      </section>

      {/* earnings */}
      <section className="rounded-2xl border p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Earnings & Allowances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputField
            label="Gross Salary"
            name="grossSalary"
            type="number"
            value={form.grossSalary}
            readOnly
            placeholder="Select an employee to auto-fill"
            description="Auto-fetched from the selected employee."
          />
          <InputField
            label="Basic Salary (66.67%)"
            name="basicSalary"
            type="number"
            value={form.basicSalary}
            readOnly
            description="Auto-calculated as 66.67% of Gross Salary."
          />
          <InputField
            label="Utilities (Gross - Basic)"
            name="utilities"
            type="number"
            value={form.utilities}
            readOnly
            description="Auto-calculated as Gross Salary minus Basic Salary."
          />
          {[
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
          <InputField
            label="Taxable Salary (Current Month)"
            name="taxableSalaryCurrentMonth"
            type="number"
            value={derivedTaxValues.taxableMonthly}
            readOnly
            placeholder="Matches Gross Salary"
            description="Mirrors Gross Salary for reference."
          />
          <InputField
            label="Annual Taxable Salary"
            name="annualTaxableSalary"
            type="number"
            value={derivedTaxValues.annualTaxable}
            readOnly
            placeholder="Gross x 12"
            description="Calculated as current taxable salary multiplied by 12."
          />
          <InputField
            label="Annual Income Tax"
            name="annualIncomeTax"
            type="number"
            value={derivedTaxValues.annualIncomeTax}
            readOnly
            placeholder="Based on tax slabs"
            description="Auto-computed using the provided Pakistan tax slabs."
          />
          <InputField
            label="Monthly Income Tax"
            name="incomeTax"
            type="number"
            value={derivedTaxValues.monthlyIncomeTax}
            readOnly
            placeholder="Annual tax / 12"
            description="Auto-calculated from the annual income tax."
          />
          {["fine", "loanDeduction", "degreeDeduction"].map(
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
          <InputField
            label="Advance"
            name="advance"
            type="number"
            value={form.advance}
            onChange={set("advance")}
          />
          <InputField
            label="Total Deduction"
            name="totalDeduction"
            type="number"
            value={deductionSummary.display}
            readOnly
            placeholder="Advance + Monthly Income Tax"
            description="Shows monthly income tax plus advance."
          />
          <InputField
            label={
              payrollMonthLabel
                ? `Net Salary Payable for the month of ${payrollMonthLabel}`
                : "Net Salary Payable"
            }
            name="salaryPayable"
            type="number"
            value={netSalaryPayable.display}
            readOnly
            placeholder="Taxable salary - total deductions"
            description="Calculated automatically from the taxable salary and total deductions."
          />
          <InputField
            label="Arrears Previous Payable Salary"
            name="arrearsPreviousPayableSalary"
            type="number"
            value={form.arrearsPreviousPayableSalary}
            onChange={set("arrearsPreviousPayableSalary")}
          />
          <InputField
            label={paymentInMonthSummary.label}
            name="paymentInMonthOf"
            type="number"
            value={paymentInMonthSummary.display}
            readOnly
            placeholder="Net salary payable + arrears"
            description="Net salary payable plus arrears previously payable."
          />
          <InputField
            label="Payment Date"
            name="paymentDate"
            type="date"
            value={form.paymentDate}
            onChange={set("paymentDate")}
          />
          <InputField
            label="Bank"
            name="bank"
            value={form.bank}
            onChange={set("bank")}
            placeholder="Enter bank name (can stay blank)"
          />
          <InputField
            label="Cheque"
            name="cheque"
            type="number"
            value={form.cheque}
            onChange={set("cheque")}
          />
          <InputField
            label="Closing Payable"
            name="closingPayable"
            type="number"
            value={form.closingPayable}
            onChange={set("closingPayable")}
          />
          <InputField
            label="Remarks"
            name="remarks"
            value={form.remarks}
            onChange={set("remarks")}
            placeholder="Optional notes"
          />
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
