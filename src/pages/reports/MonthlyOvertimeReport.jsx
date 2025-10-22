import React from "react";
import { useInstructorOvertimeMonthlyReport } from "@/hooks/useInstructorOvertimeReport";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, idx) => CURRENT_YEAR - idx);
const ALL_INSTRUCTORS_OPTION = "__ALL__";

function formatCount(value) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat().format(value);
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return "0 h";
  const digits = hours >= 10 ? 1 : 2;
  return `${hours.toFixed(digits)} h`;
}

function minutesToHuman(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 min";
  return `${Math.round(minutes)} min`;
}

function formatDateLabel(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function numberOrNull(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function formatRs(amount) {
  if (!Number.isFinite(amount)) return "--";
  const rounded = Math.round(amount);
  return `Rs ${new Intl.NumberFormat().format(rounded)}`;
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-");
}

function calcOvertimePayout(claim) {
  if (!claim) return null;
  const salary = numberOrNull(claim?.salary);
  const minutes = numberOrNull(claim?.totalDurationMinutes);
  if (salary === null || minutes === null) return null;
  const date = new Date(claim.date);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  if (!Number.isFinite(daysInMonth) || daysInMonth <= 0) return null;
  const perMinute = salary / daysInMonth / 9 / 60;
  return perMinute * minutes;
}

export default function MonthlyOvertimeReport() {
  const defaultParams = React.useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, instructorId: null };
  }, []);

  const [params, setParams] = React.useState(defaultParams);
  const { report, loading, fetchReport } =
    useInstructorOvertimeMonthlyReport(defaultParams);

  const selectedYear = params.year;
  const selectedMonth = params.month;
  const selectedInstructorId = params.instructorId;

  React.useEffect(() => {
    if (!selectedYear || !selectedMonth) return;
    fetchReport({
      year: selectedYear,
      month: selectedMonth,
      instructorId: selectedInstructorId || undefined,
    }).catch(() => {});
  }, [fetchReport, selectedInstructorId, selectedMonth, selectedYear]);

  const handleMonthChange = (value) => {
    setParams((prev) => ({ ...prev, month: Number(value) }));
  };

  const handleYearChange = (value) => {
    setParams((prev) => ({ ...prev, year: Number(value) }));
  };

  const handleInstructorChange = (value) => {
    setParams((prev) => ({
      ...prev,
      instructorId: value === ALL_INSTRUCTORS_OPTION ? null : value,
    }));
  };

  const refreshReport = React.useCallback(() => {
    if (!selectedYear || !selectedMonth) return;
    fetchReport({
      year: selectedYear,
      month: selectedMonth,
      instructorId: selectedInstructorId || undefined,
    }).catch(() => {});
  }, [fetchReport, selectedInstructorId, selectedMonth, selectedYear]);

  const instructorOptions = React.useMemo(() => {
    if (!report?.instructors) return [];
    return report.instructors.map((item) => ({
      value: String(item.instructorId),
      label: item.instructorName || "Unknown",
    }));
  }, [report?.instructors]);

  React.useEffect(() => {
    if (!selectedInstructorId || !report?.instructors) return;
    const stillExists = report.instructors.some(
      (item) => String(item.instructorId) === String(selectedInstructorId)
    );
    if (!stillExists) {
      setParams((prev) => ({ ...prev, instructorId: null }));
    }
  }, [report?.instructors, selectedInstructorId]);

  const selectedInstructor = React.useMemo(() => {
    if (!selectedInstructorId) return null;
    if (!report?.selectedInstructor) return null;
    if (
      String(report.selectedInstructor.instructorId) !==
      String(selectedInstructorId)
    ) {
      return null;
    }
    return report.selectedInstructor;
  }, [report?.selectedInstructor, selectedInstructorId]);

  const selectedClaims = selectedInstructor?.claims || [];
  const totalCalculatedPayout = React.useMemo(() => {
    if (!selectedInstructor) return 0;
    return selectedClaims.reduce((sum, claim) => {
      const payout =
        Number.isFinite(claim.calculatedPayout) && claim.calculatedPayout !== null
          ? claim.calculatedPayout
          : calcOvertimePayout(claim);
      if (!claim.verified) return sum;
      return sum + (Number.isFinite(payout) ? payout : 0);
    }, 0);
  }, [selectedClaims, selectedInstructor]);

  const canDownloadPdf =
    !loading && selectedInstructor && selectedClaims.length > 0;

  const downloadPdf = React.useCallback(() => {
    if (!canDownloadPdf || !selectedInstructor) return;

    const monthLabel =
      report?.period?.label ||
      `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label ?? "Month"} ${selectedYear}`;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

    const primaryColor = [37, 99, 235]; // Tailwind blue-600
    const mutedColor = [100, 116, 139]; // slate-500
    const borderColor = [226, 232, 240]; // slate-200

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text("Monthly Overtime Report", margin, margin);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...mutedColor);
    doc.text(`Period: ${monthLabel}`, margin, margin + 18);

    const instructorLines = [
      `Instructor: ${selectedInstructor.instructorName || "Unknown"}`,
      `Designation: ${selectedInstructor.designation || "--"}`,
      `Branch: ${selectedInstructor.branchName || "--"}`,
    ];
    doc.text(instructorLines, margin, margin + 36);

    const summaryY = margin + 74;
    const metrics = [
      {
        label: "Total Claims",
        value: formatCount(selectedInstructor.totalClaims),
      },
      {
        label: "Verified Claims",
        value: formatCount(selectedInstructor.verifiedClaims),
      },
      {
        label: "Total Minutes",
        value: formatCount(selectedInstructor.totalMinutes),
      },
      {
        label: "Total Hours",
        value: formatHours(selectedInstructor.totalHours),
      },
      {
        label: "Verified Payout",
        value: formatRs(totalCalculatedPayout),
      },
    ];

    const metricWidth = contentWidth / metrics.length;
    doc.setFontSize(9);
    metrics.forEach((metric, index) => {
      const x = margin + index * metricWidth;
      doc.setDrawColor(...borderColor);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, summaryY, metricWidth - 10, 54, 6, 6, "FD");
      doc.setTextColor(...mutedColor);
      doc.text(metric.label, x + 14, summaryY + 20);
      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(metric.value, x + 14, summaryY + 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    });

    const tableStartY = summaryY + 80;
    const tableBody = selectedClaims.map((claim) => {
      const payout =
        Number.isFinite(claim.calculatedPayout) && claim.calculatedPayout !== null
          ? claim.calculatedPayout
          : calcOvertimePayout(claim);
      const salary = numberOrNull(claim.salary);
      return [
        formatDateLabel(claim.date),
        claim.branchName || "--",
        claim.designation || "--",
        minutesToHuman(claim.totalDurationMinutes),
        salary !== null ? formatRs(salary) : "--",
        formatRs(Number.isFinite(payout) ? payout : NaN),
        claim.verified ? "Verified" : "Pending",
        (claim.notes || "").trim() || "--",
      ];
    });

    autoTable(doc, {
      head: [
        [
          "Date",
          "Branch",
          "Designation",
          "Minutes",
          "Monthly Salary",
          "Calculated Payout",
          "Status",
          "Notes",
        ],
      ],
      body: tableBody,
      startY: tableStartY,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 9,
        lineColor: borderColor,
      },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "center" },
      },
      styles: {
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
      },
      didDrawPage: (data) => {
        const footerY = doc.internal.pageSize.getHeight() - margin + 10;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Generated on ${new Date().toLocaleString()}`,
          margin,
          footerY
        );
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          pageWidth - margin,
          footerY,
          { align: "right" }
        );
      },
    });

    const finalY = doc.lastAutoTable.finalY || tableStartY;
    const summaryBlockY = Math.max(finalY + 16, doc.internal.pageSize.getHeight() - 200);

    if (summaryBlockY + 150 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
    }

    const availableBottom = doc.internal.pageSize.getHeight() - margin;
    const summaryBoxTop = availableBottom - 150;
    doc.setDrawColor(...borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, summaryBoxTop, contentWidth, 70, 6, 6, "FD");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text("Verified payout total", margin + 18, summaryBoxTop + 26);
    doc.setFontSize(18);
    doc.text(formatRs(totalCalculatedPayout), margin + 18, summaryBoxTop + 48);
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text(
      "Only verified overtime entries are included in this payout total.",
      margin + 18,
      summaryBoxTop + 62
    );

    const signatureBoxTop = summaryBoxTop + 80;
    const signatureLabels = [
      "Requested by",
      "Checked by",
      "Reviewed by",
      "Approved by",
    ];
    const signatureWidth = contentWidth / signatureLabels.length;

    doc.setDrawColor(...borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, signatureBoxTop, contentWidth, 60, 6, 6, "FD");

    signatureLabels.forEach((label, index) => {
      const x = margin + index * signatureWidth;
      doc.setFontSize(9);
      doc.setTextColor(...mutedColor);
      doc.text(label, x + 14, signatureBoxTop + 20);
      doc.setDrawColor(...borderColor);
      doc.line(x + 14, signatureBoxTop + 40, x + signatureWidth - 16, signatureBoxTop + 40);
    });

    const fileName = `overtime_${slug(selectedInstructor.instructorName)}_${selectedYear}_${String(
      selectedMonth
    ).padStart(2, "0")}.pdf`;

    doc.save(fileName);
  }, [
    canDownloadPdf,
    report?.period?.label,
    selectedClaims,
    selectedInstructor,
    selectedMonth,
    selectedYear,
    totalCalculatedPayout,
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Monthly Instructor Overtime Report
        </h1>
        <p className="text-sm text-muted-foreground">
          Review monthly overtime activity, then drill into a specific instructor.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Report Controls</h2>
            <p className="text-sm text-muted-foreground">
              Choose the reporting month and optionally focus on an instructor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(selectedYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={
                selectedInstructorId
                  ? String(selectedInstructorId)
                  : ALL_INSTRUCTORS_OPTION
              }
              onValueChange={handleInstructorChange}
              disabled={!instructorOptions.length}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue
                  placeholder={
                    instructorOptions.length ? "Choose instructor" : "No instructors"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_INSTRUCTORS_OPTION}>
                  All instructors
                </SelectItem>
                {instructorOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={refreshReport} disabled={loading}>
              Refresh
            </Button>
            <Button
              type="button"
              onClick={downloadPdf}
              disabled={!canDownloadPdf}
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Period</p>
            <p className="text-lg font-semibold">
              {report?.period?.label ||
                `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label ?? "Month"} ${selectedYear}`}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Unique instructors
            </p>
            <p className="text-2xl font-semibold">
              {formatCount(report?.totals?.uniqueInstructors)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Total claims</p>
            <p className="text-2xl font-semibold">
              {formatCount(report?.totals?.totalClaims)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Verified claims</p>
            <p className="text-2xl font-semibold">
              {formatCount(report?.totals?.totalVerifiedClaims)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase text-muted-foreground">Total hours</p>
            <p className="text-lg font-semibold">
              {formatHours(report?.totals?.totalHours)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 md:p-6">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading report…</div>
        )}

        {!loading && !selectedInstructorId && (
          <div className="text-sm text-muted-foreground">
            Select an instructor above to inspect individual overtime claims for the chosen month.
          </div>
        )}

        {!loading && selectedInstructorId && !selectedInstructor && (
          <div className="text-sm text-muted-foreground">
            No overtime claims found for the selected instructor in this month.
          </div>
        )}

        {!loading && selectedInstructor && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedInstructor.instructorName || "Unknown instructor"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedInstructor.designation || "--"} -{" "}
                  {selectedInstructor.branchName || "--"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  Claims:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCount(selectedInstructor.totalClaims)}
                  </span>
                </span>
                <span>
                  Verified:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCount(selectedInstructor.verifiedClaims)}
                  </span>
                </span>
                <span>
                  Total minutes:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCount(selectedInstructor.totalMinutes)}
                  </span>
                </span>
                <span>
                  Total hours:{" "}
                  <span className="font-semibold text-foreground">
                    {formatHours(selectedInstructor.totalHours)}
                  </span>
                </span>
              </div>
            </div>

            {selectedClaims.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No overtime claims recorded for this instructor.
              </div>
            ) : (
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead className="text-right">Total minutes</TableHead>
                    <TableHead className="text-right">Monthly salary</TableHead>
                    <TableHead className="text-right">Calculated payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedClaims.map((claim) => {
                    const salary = numberOrNull(claim.salary);
                    const payout =
                      Number.isFinite(claim.calculatedPayout) &&
                      claim.calculatedPayout !== null
                        ? claim.calculatedPayout
                        : calcOvertimePayout(claim);
                    return (
                      <TableRow key={claim._id}>
                        <TableCell>{formatDateLabel(claim.date)}</TableCell>
                        <TableCell>{claim.branchName || "--"}</TableCell>
                        <TableCell>{claim.designation || "--"}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {minutesToHuman(claim.totalDurationMinutes)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {salary !== null ? formatRs(salary) : "--"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatRs(payout)}
                        </TableCell>
                        <TableCell>
                          {claim.verified ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              Verified
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {claim.notes?.trim() || "--"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right font-semibold">
                      Total calculated payout
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatRs(totalCalculatedPayout)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
