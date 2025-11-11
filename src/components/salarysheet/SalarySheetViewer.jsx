import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import InputField from "@/components/form/InputField";
import UserPicker from "@/components/userpicker/UserPicker";
import useSalarySheet from "@/hooks/useSalarySheet";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Download, Loader2, Pencil, Save, X } from "lucide-react";

const toNum = (v) =>
  v === "" || v == null ? 0 : Number.isNaN(Number(v)) ? 0 : Number(v);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const NUMERIC_FIELDS = new Set([
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
  "fine",
  "loanDeduction",
  "degreeDeduction",
  "advance",
  "arrearsPreviousPayableSalary",
  "closingPayable",
  "cheque",
]);

const EDITABLE_FIELDS = [
  "bankAccountNo",
  "bankAccountTitle",
  "bankBranchCode",
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
  "fine",
  "loanDeduction",
  "degreeDeduction",
  "advance",
  "arrearsPreviousPayableSalary",
  "paymentDate",
  "bank",
  "cheque",
  "closingPayable",
  "remarks",
];

const LOCKED_EARNINGS = ["grossSalary", "basicSalary", "utilities"];
const EARNING_FIELDS = [
  ...LOCKED_EARNINGS,
  "previousMonthOmission",
  "extraDaysWorked",
  "overtimeAllDays",
  "mobileAllowance",
  "mealAllowance",
  "otherOvertimeAllHours",
  "ontimeIncentive",
  "conveyanceTaDa",
];

const DEDUCTION_FIELDS = ["fine", "loanDeduction", "degreeDeduction", "advance"];

const BANK_FIELDS = ["bankAccountNo", "bankAccountTitle", "bankBranchCode"];

const PAYABLE_FIELDS = [
  "arrearsPreviousPayableSalary",
  "paymentDate",
  "bank",
  "cheque",
  "closingPayable",
  "remarks",
];

const defaultFormState = EDITABLE_FIELDS.reduce((acc, key) => {
  acc[key] = NUMERIC_FIELDS.has(key) ? "0" : "";
  return acc;
}, {});

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const labelize = (field) =>
  field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const gradientPalette = [
  "from-sky-50 via-white to-cyan-50",
  "from-emerald-50 via-white to-teal-50",
  "from-indigo-50 via-white to-purple-50",
  "from-rose-50 via-white to-amber-50",
];

function mapSheetToForm(sheet) {
  if (!sheet) return { ...defaultFormState };
  return EDITABLE_FIELDS.reduce((acc, key) => {
    if (key === "paymentDate") {
      acc[key] = formatDateInput(sheet[key]);
    } else if (NUMERIC_FIELDS.has(key)) {
      acc[key] =
        sheet[key] == null || Number.isNaN(Number(sheet[key]))
          ? "0"
          : String(sheet[key]);
    } else {
      acc[key] = sheet[key] == null ? "" : String(sheet[key]);
    }
    return acc;
  }, {});
}

export default function SalarySheetViewer() {
  const now = new Date();
  const initialMonthValue = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const [selection, setSelection] = useState({
    userId: "",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthInput: initialMonthValue,
  });

  const {
    fetchSalarySheet,
    updateSalarySheet,
    fetching,
    updating,
    error,
    setError,
  } = useSalarySheet();

  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({ ...defaultFormState });
  const [viewerError, setViewerError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const payrollLabel = useMemo(() => {
    if (!selection.year || !selection.month) return "";
    return `${MONTHS[selection.month - 1]} ${selection.year}`;
  }, [selection.year, selection.month]);

  const summaryCards = useMemo(() => {
    if (!sheet) return [];
    return [
      {
        label: "Gross Salary",
        value: formatCurrency(sheet.grossSalary),
      },
      {
        label: "Net Salary Payable",
        value: formatCurrency(sheet.netSalaryPayableCurrentMonth),
      },
      {
        label: "Payment In Month",
        value: formatCurrency(sheet.paymentInMonthAmount),
        caption: sheet.paymentInMonthOf || payrollLabel,
      },
      {
        label: "Monthly Income Tax",
        value: formatCurrency(sheet.incomeTax),
      },
    ];
  }, [sheet, payrollLabel]);

  const handleUserChange = (userId) => {
    setSelection((prev) => ({ ...prev, userId }));
  };

  const loadSheet = useCallback(async () => {
    if (!selection.userId || !selection.year || !selection.month) return;
    try {
      const result = await fetchSalarySheet({
        userId: selection.userId,
        year: selection.year,
        month: selection.month,
      });
      if (!result) {
        setViewerError(
          "No salary sheet found for the selected user and payroll period."
        );
        setSheet(null);
        setForm({ ...defaultFormState });
        setIsEditing(false);
        return;
      }
      setViewerError(null);
      setSheet(result);
      setForm(mapSheetToForm(result));
      setIsEditing(false);
    } catch (err) {
      setViewerError(err?.message || "Failed to fetch salary sheet.");
    }
  }, [fetchSalarySheet, selection]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const handleFieldChange = (field) => (value) => {
    const val = value?.target ? value.target.value : value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (viewerError) setViewerError(null);
    if (error) setError(null);
  };

  const handleUpdate = async () => {
    if (!sheet?._id) return;
    const payload = {};
    Object.entries(form).forEach(([key, value]) => {
      if (NUMERIC_FIELDS.has(key)) {
        payload[key] = toNum(value);
      } else if (key === "paymentDate") {
        payload[key] = value || null;
      } else {
        payload[key] = value ?? "";
      }
    });

    try {
      const updated = await updateSalarySheet(sheet._id, payload);
      setSheet(updated);
      setForm(mapSheetToForm(updated));
      setIsEditing(false);
      toast.success("Salary sheet updated");
    } catch (err) {
      setViewerError(err?.message || "Failed to update salary sheet.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!sheet) {
      toast.error("Load a salary sheet first");
      return;
    }

    try {
      setPdfGenerating(true);

      const buildDocument = (scale = 1) => {
        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        let cursorY = margin;
        let overflowed = false;

        const sc = (value) => Math.max(2, value * scale);

        const addPageIfNeeded = (lineHeight = 8) => {
          if (cursorY + lineHeight > pageHeight - margin) {
            overflowed = true;
            cursorY = pageHeight - margin - lineHeight;
          }
        };

        const drawHeading = (title, subtitle) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(16 * scale);
          doc.text(title, margin, cursorY);
          cursorY += sc(6);
          if (subtitle) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9 * scale);
            doc.setTextColor(100);
            doc.text(subtitle, margin, cursorY);
            doc.setTextColor(20);
            cursorY += sc(6);
          }
          doc.setDrawColor(230);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += sc(3);
        };

        const drawSectionTitle = (title) => {
          addPageIfNeeded(sc(6));
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11 * scale);
          doc.text(title, margin, cursorY);
          cursorY += sc(4);
          doc.setDrawColor(235);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += sc(2.5);
        };

        const drawRows = (rows, columns = 1) => {
          const gutter = columns > 1 ? sc(5) : 0;
          const colWidth = (pageWidth - margin * 2 - gutter * (columns - 1)) / columns;

          for (let i = 0; i < rows.length; i += columns) {
            const slice = rows.slice(i, i + columns);
            addPageIfNeeded(sc(8));
            let blockHeight = 0;

            slice.forEach((row, idx) => {
              const x = margin + idx * (colWidth + gutter);
              const label = row.label || "";
              const value = row.value || "?";

              doc.setFont("helvetica", "bold");
              doc.setFontSize(Math.max(6, 8 * scale));
              doc.text(label, x, cursorY);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(Math.max(7, 9 * scale));
              const lines = doc.splitTextToSize(value, colWidth - 2);
              doc.text(lines, x, cursorY + sc(3.5));

              const height = sc(3.5) + lines.length * sc(3.2) + sc(1.5);
              blockHeight = Math.max(blockHeight, height);
            });

            cursorY += blockHeight;
            cursorY += sc(1);
            addPageIfNeeded();
          }
        };

        const drawPaymentHighlight = (amount, label) => {
          const boxHeight = sc(18);
          addPageIfNeeded(boxHeight);
          const boxWidth = pageWidth - margin * 2;
          doc.setDrawColor(180);
          doc.setFillColor(232, 244, 255);
          doc.roundedRect(margin, cursorY, boxWidth, boxHeight, sc(2), sc(2), 'F');

          const padding = sc(3);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(Math.max(6, 8 * scale));
          doc.setTextColor(41, 94, 183);
          doc.text("Payment In Month", margin + padding, cursorY + sc(4.5));

          doc.setTextColor(20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(Math.max(12, 16 * scale));
          doc.text(formatCurrency(amount || 0), margin + padding, cursorY + sc(10));

          doc.setFont("helvetica", "normal");
          doc.setFontSize(Math.max(6, 8 * scale));
          doc.text(label || "?", margin + padding, cursorY + sc(14));

          cursorY += boxHeight + sc(2);
        };

        const pdfData = {
          ...sheet,
          ...Object.entries(form).reduce((acc, [key, value]) => {
            acc[key] = NUMERIC_FIELDS.has(key) ? toNum(value) : value;
            return acc;
          }, {}),
        };

        drawHeading("Salary Statement", `${sheet.fullName} ? ${payrollLabel || ""}`);

        drawSectionTitle("Executive Summary");
        drawRows(
          [
            { label: "Gross Salary", value: formatCurrency(sheet.grossSalary) },
            {
              label: "Net Salary Payable",
              value: formatCurrency(sheet.netSalaryPayableCurrentMonth),
            },
            {
              label: "Payment In Month",
              value: `${formatCurrency(sheet.paymentInMonthAmount)} (${sheet.paymentInMonthOf || payrollLabel})`,
            },
            {
              label: "Monthly Income Tax",
              value: formatCurrency(sheet.incomeTax),
            },
          ],
          2,
        );

        drawSectionTitle("Bank Snapshot");
        drawRows(
          BANK_FIELDS.map((field) => ({
            label: labelize(field),
            value: String(pdfData[field] || "?"),
          })),
          2,
        );

        drawSectionTitle("Earnings & Allowances");
        drawRows(
          EARNING_FIELDS.map((field) => ({
            label: labelize(field),
            value: formatCurrency(pdfData[field]),
          })),
          2,
        );

        drawSectionTitle("Taxes & Deductions");
        drawRows(
          [
            ...DEDUCTION_FIELDS.map((field) => ({
              label: labelize(field),
              value: formatCurrency(pdfData[field]),
            })),
            {
              label: "Taxable Salary (Monthly)",
              value: formatCurrency(sheet.taxableSalaryCurrentMonth),
            },
            {
              label: "Annual Taxable Salary",
              value: formatCurrency(sheet.annualTaxableSalary),
            },
            {
              label: "Annual Income Tax",
              value: formatCurrency(sheet.annualIncomeTax),
            },
          ],
          2,
        );

        drawSectionTitle("Payables & Payment");
        drawRows(
          PAYABLE_FIELDS.map((field) => ({
            label: labelize(field),
            value: field.toLowerCase().includes("date")
              ? formatDateInput(pdfData[field]) || "?"
              : NUMERIC_FIELDS.has(field)
              ? formatCurrency(pdfData[field])
              : String(pdfData[field] || "?"),
          })),
          2,
        );

        drawPaymentHighlight(
          sheet.paymentInMonthAmount,
          sheet.paymentInMonthOf || payrollLabel,
        );

        return { doc, overflowed };
      };

      let scale = 1;
      let result = buildDocument(scale);
      while (result.overflowed && scale > 0.6) {
        scale -= 0.1;
        result = buildDocument(scale);
      }

      if (result.overflowed) {
        toast.warning("PDF content is dense; some sections may be compacted.");
      }

      const fileName = `${
        sheet.fullName?.replace(/\s+/g, "_") || "salary-sheet"
      }_${selection.year}-${String(selection.month).padStart(2, "0")}.pdf`;
      result.doc.save(fileName);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfGenerating(false);
    }
  };


  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-white/70 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-6 shadow-[0_25px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                Salary Intelligence
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Retrieve Salary Sheet
              </h2>
              <p className="text-sm text-slate-500 max-w-3xl">
                Select a teammate and payroll period. We will load the latest
                salary sheet with options to edit inline or export a gorgeous
                A4 PDF.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <UserPicker
                value={selection.userId}
                onChange={handleUserChange}
              />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">
                  Payroll Month
                </label>
                <input
                  type="month"
                  className="h-11 w-full rounded-2xl border border-white/70 bg-white/80 px-3 text-sm text-slate-700 shadow-inner shadow-white/60 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={selection.monthInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    const [yy, mm] = val.split("-").map((x) => Number(x));
                    setSelection((prev) => ({
                      ...prev,
                      monthInput: val,
                      year: Number.isFinite(yy) ? yy : prev.year,
                      month: Number.isFinite(mm) ? mm : prev.month,
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-600">
                  Selected Period
                </label>
                <div className="flex h-11 items-center rounded-2xl border border-white/70 bg-gradient-to-r from-white to-slate-50 px-3 text-sm font-medium text-slate-700 shadow-inner shadow-white/60">
                  {payrollLabel || "—"}
                </div>
              </div>
            </div>
          </div>
          <Button
            onClick={loadSheet}
            disabled={!selection.userId || fetching}
            className="h-11 min-w-[180px] rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 text-base font-semibold shadow-lg shadow-sky-200/60 hover:from-sky-400 hover:via-cyan-500 hover:to-indigo-500"
          >
            {fetching ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </span>
            ) : (
              "Load Salary Sheet"
            )}
          </Button>
        </div>
        {viewerError ? (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-600">
            {viewerError}
          </p>
        ) : null}
      </section>

      {sheet ? (
        <section className="rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-end gap-3 pb-5">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="rounded-2xl border-slate-200 bg-gradient-to-r from-white to-slate-50 text-slate-700 shadow-sm shadow-white/80 hover:border-slate-300"
            >
              {pdfGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing PDF
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" /> Download PDF
                </span>
              )}
            </Button>
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(mapSheetToForm(sheet));
                    setIsEditing(false);
                  }}
                  disabled={updating}
                  className="rounded-2xl text-slate-500 hover:text-slate-900"
                >
                  <span className="flex items-center gap-2">
                    <X className="h-4 w-4" /> Cancel
                  </span>
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/60"
                >
                  {updating ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" /> Save Changes
                    </span>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                onClick={() => setIsEditing(true)}
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/70"
              >
                <span className="flex items-center gap-2">
                  <Pencil className="h-4 w-4" /> Edit Sheet
                </span>
              </Button>
            )}
          </div>

          <div className="mt-6 space-y-8 rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-cyan-50 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item, idx) => (
                <div
                  key={item.label}
                  className={`rounded-3xl border border-white/70 bg-gradient-to-br p-5 shadow-lg shadow-sky-100/60 ${
                    gradientPalette[idx % gradientPalette.length]
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {item.value}
                  </p>
                  {item.caption ? (
                    <p className="text-xs text-slate-500 mt-1">
                      {item.caption}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-semibold text-slate-900">
                  Bank Snapshot
                </h4>
                <p className="text-sm text-slate-500">
                  Synced with user profile, still editable when necessary.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {BANK_FIELDS.map((field) => (
                  <InputField
                    key={field}
                    label={labelize(field)}
                    name={field}
                    value={form[field]}
                    onChange={handleFieldChange(field)}
                    readOnly={!isEditing}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-semibold text-slate-900">
                  Earnings & Allowances
                </h4>
                <p className="text-sm text-slate-500">
                  Capture every earning block rolling into gross.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {EARNING_FIELDS.map((field) => (
                  <InputField
                    key={field}
                    label={labelize(field)}
                    name={field}
                    type="number"
                    value={form[field]}
                    onChange={handleFieldChange(field)}
                    readOnly={!isEditing}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-semibold text-slate-900">
                  Taxes & Deductions
                </h4>
                <p className="text-sm text-slate-500">
                  Automated slab calculations keep compliance effortless.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {DEDUCTION_FIELDS.map((field) => (
                  <InputField
                    key={field}
                    label={labelize(field)}
                    name={field}
                    type="number"
                    value={form[field]}
                    onChange={handleFieldChange(field)}
                    readOnly={!isEditing}
                  />
                ))}
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Taxable Salary
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(sheet.taxableSalaryCurrentMonth)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Annual: {formatCurrency(sheet.annualTaxableSalary)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Income Tax
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {formatCurrency(sheet.incomeTax)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Annual: {formatCurrency(sheet.annualIncomeTax)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-semibold text-slate-900">
                  Payables & Payment
                </h4>
                <p className="text-sm text-slate-500">
                  All payout context captured in one modern canvas.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {PAYABLE_FIELDS.map((field) => (
                  <InputField
                    key={field}
                    label={labelize(field)}
                    name={field}
                    type={
                      field.toLowerCase().includes("date")
                        ? "date"
                        : NUMERIC_FIELDS.has(field)
                        ? "number"
                        : "text"
                    }
                    value={form[field]}
                    onChange={handleFieldChange(field)}
                    readOnly={!isEditing && field !== "remarks"}
                  />
                ))}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Net Salary Payable
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(sheet.salaryPayable || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Total Deduction
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(sheet.totalDeduction || 0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Payment In Month
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrency(sheet.paymentInMonthAmount || 0)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sheet.paymentInMonthOf || payrollLabel}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </div>
  );
}
