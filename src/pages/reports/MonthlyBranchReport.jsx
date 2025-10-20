// src/components/reports/MonthlyBranchReport.jsx
import React from "react";
import useAttendanceReport from "@/hooks/useAttendanceReport";
import { ORDER, LABELS } from "@/components/constants/attendance";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// month/year pickers
const MONTHS = [
  { n: 1, label: "Jan" }, { n: 2, label: "Feb" }, { n: 3, label: "Mar" }, { n: 4, label: "Apr" },
  { n: 5, label: "May" }, { n: 6, label: "Jun" }, { n: 7, label: "Jul" }, { n: 8, label: "Aug" },
  { n: 9, label: "Sep" }, { n: 10, label: "Oct" }, { n: 11, label: "Nov" }, { n: 12, label: "Dec" },
];
function range(n) { return Array.from({ length: n }, (_, i) => i); }
const YEARS = (() => { const y = new Date().getFullYear(); return range(6).map(i => y - i); })();

function slug(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
}

export default function MonthlyBranchReport() {
  const { branch, setBranch, year, setYear, month, setMonth, loading, error, grouped } = useAttendanceReport();

  // derive available branches from the loaded rows (so dropdown isn't empty)
  const derivedBranches = React.useMemo(() => {
    const set = new Set(["all"]);
    for (const sec of grouped.sections || []) {
      for (const r of sec.items || []) {
        if (r.branch && typeof r.branch === "string") set.add(r.branch);
      }
    }
    return Array.from(set);
  }, [grouped.sections]);

  // ===== PDF EXPORT (sexy + professional) =====
  function downloadPdf() {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;

  const monthNum = Number(month);
  const monthLabel = MONTHS.find((m) => m.n === monthNum)?.label || String(monthNum);
  const branchLabel = branch === "all" ? "All" : branch;
  const reportTitle = `Monthly Branch Report — ${monthLabel} ${year}`;
  const reportSub = `Branch: ${branchLabel}`;

  // chrome painter – called before each table page via addPageContent
  const paintBackground = (pageNumber) => {
    // gradient header (very light)
    const headerH = 64;
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const y = margin + (i * headerH) / steps;
      const shade = 255 - i * 2; // super subtle
      doc.setFillColor(shade, shade, 255);
      doc.rect(margin, y, pageW - margin * 2, headerH / steps, "F");
    }

    // page border
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);

  

    // header text
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.text(reportTitle, margin + 14, margin + 26);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(reportSub, margin + 14, margin + 42);

    // footer page number (will be visible after table too)
    doc.setTextColor(140);
    doc.setFontSize(9);
    doc.text(`Page ${pageNumber}`, pageW - margin - 54, pageH - margin + 14);
  };

  // first page chrome
  let pageNo = 1;
  paintBackground(pageNo);

  const tableHead = ["Full Name", "Emp ID", ...ORDER.map((k) => LABELS[k])];
  let cursorY = margin + 80;

  // draw each department
  grouped.sections.forEach((sec, idx) => {
    // section label
    doc.setFontSize(11);
    doc.setTextColor(55);
    doc.text(`Department: ${sec.dept}`, margin + 8, cursorY);
    cursorY += 8;

    const body = sec.items.map((r) => [
      r.fullName,
      r.employeeId || "",
      ...ORDER.map((k) => r[k] || 0),
    ]);

    autoTable(doc, {
      head: [tableHead],
      body,
      startY: cursorY,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 247, 255], textColor: 30, lineColor: [225, 230, 240] },
      bodyStyles: { textColor: 60, lineColor: [235, 238, 246] },
      theme: "grid",
      margin: { left: margin + 8, right: margin + 8 },

      // IMPORTANT: this runs BEFORE the table is painted on each page
      addPageContent: () => {
        // When autoTable makes a new page, increase counter and repaint background
        const currentPage = doc.internal.getNumberOfPages();
        if (currentPage !== pageNo) {
          pageNo = currentPage;
        }
        paintBackground(pageNo);
      },
    });

    cursorY = doc.lastAutoTable.finalY + 24;

    // manual page break before next section if not enough space for approval block later
    if (idx < grouped.sections.length - 1 && cursorY > pageH - 180) {
      doc.addPage();
      pageNo += 1;
      paintBackground(pageNo);
      cursorY = margin + 80;
    }
  });

  // approval summary block at end
  const sigHeight = 120;
  if (cursorY + sigHeight > pageH - margin) {
    doc.addPage();
    pageNo += 1;
    paintBackground(pageNo);
    cursorY = margin + 80;
  }
  const blockTop = Math.max(cursorY, pageH - margin - sigHeight);
  const blockLeft = margin + 24;
  doc.setFontSize(12);
  doc.setTextColor(45);
  doc.text("Approval Records", blockLeft, blockTop);

  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(
    "Approvals are logged digitally with employee submission and team lead decision timestamps.",
    blockLeft,
    blockTop + 24,
    { maxWidth: pageW - blockLeft * 2 }
  );

  doc.setFontSize(9);
  doc.setTextColor(120);
  const printedOn = new Date().toLocaleString();
  doc.text(`Generated: ${printedOn}`, blockLeft, pageH - margin - 8);

  const file = `attendance_report_${slug(branchLabel)}_${year}_${slug(monthLabel)}.pdf`;
  doc.save(file);
}
  // ===== end PDF export =====

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Monthly Branch Report</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch */}
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {derivedBranches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b === "all" ? "All branches" : b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Month */}
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.n} value={String(m.n)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Year */}
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={downloadPdf}>Download PDF</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border p-6 text-sm text-red-600">{error}</div>
      ) : (grouped.sections.length === 0) ? (
        <div className="rounded-xl border p-6 text-sm text-muted-foreground">No data.</div>
      ) : (
        grouped.sections.map((sec) => (
          <div key={sec.dept} className="rounded-xl border overflow-x-auto">
            <div className="flex items-center justify-between p-4">
              <div className="text-sm font-semibold">Department: {sec.dept}</div>
            </div>
            <Table className="min-w-[980px]">
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <TableRow>
                  <TableHead className="w-[260px]">Full Name</TableHead>
                  <TableHead className="w-[120px]">Emp ID</TableHead>
                  {ORDER.map((k) => (
                    <TableHead key={k} className="text-right">{LABELS[k]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sec.items.map((r) => (
                  <TableRow key={`${sec.dept}-${r.employeeId || r.fullName}`} className="odd:bg-muted/40 hover:bg-muted/60 transition-colors">
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.employeeId}</TableCell>
                    {ORDER.map((k) => (
                      <TableCell key={k} className="text-right">{r[k] || 0}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
