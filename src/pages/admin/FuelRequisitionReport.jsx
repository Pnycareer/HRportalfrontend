import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import FuelRequisitionView from "@/pages/Fuel/FuelRequisitionView";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const LAYOUT_STEPS = [
  { margin: 12, headerFont: 17, titleFont: 18, subFont: 10.5, infoLabel: 9.5, infoValue: 8.8, infoRowHeight: 8.5, tableFont: 8.6, headFont: 9.4, padding: 1.3, lineHeight: 1.16, noteFont: 8, },
  { margin: 10, headerFont: 16, titleFont: 17, subFont: 10, infoLabel: 9, infoValue: 8.2, infoRowHeight: 7.6, tableFont: 7.8, headFont: 8.6, padding: 1, lineHeight: 1.1, noteFont: 7.5, },
  { margin: 8.5, headerFont: 15, titleFont: 16, subFont: 9.4, infoLabel: 8.3, infoValue: 7.5, infoRowHeight: 7, tableFont: 7, headFont: 7.9, padding: 0.82, lineHeight: 1.07, noteFont: 7.1, },
  { margin: 7, headerFont: 14, titleFont: 15, subFont: 9, infoLabel: 7.8, infoValue: 7, infoRowHeight: 6.4, tableFont: 6.2, headFont: 7.2, padding: 0.68, lineHeight: 1.05, noteFont: 6.8, },
];

export default function FuelRequisitionReport() {
  const now = new Date();

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filters, setFilters] = useState({
    user: "",
    month: MONTHS[now.getMonth()],
    year: now.getFullYear(),
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [verifyingSrNo, setVerifyingSrNo] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoadingUsers(true);
        const res = await api.get("/api/fuel-requisitions", { params: { limit: 1000 } });
        const seen = new Set();
        const users = [];
        (res.data?.data || []).forEach((r) => {
          const u = r.user;
          if (u && !seen.has(String(u._id))) {
            seen.add(String(u._id));
            users.push(u);
          }
        });
        if (!ignore) setAvailableUsers(users);
      } catch (e) {
        if (!ignore) {
          toast.error("Failed to load requisitions", { description: e.message });
        }
      } finally {
        if (!ignore) setLoadingUsers(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const selectedUser = useMemo(
    () => availableUsers.find((u) => String(u._id) === String(filters.user)),
    [availableUsers, filters.user]
  );

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (!filters.user) {
      toast.warning("Pick a user", { description: "Select an employee to view their requisition." });
      return;
    }
    try {
      setLoading(true);
      setResult(null);
      setVerifyingSrNo(null);
      const res = await api.get("/api/fuel-requisitions", {
        params: { user: filters.user, month: filters.month, year: filters.year, limit: 1 },
      });
      const doc = res.data?.data?.[0] || null;
      if (!doc) {
        toast.info("No requisition found", { description: "Nothing matches that employee, month, and year." });
      }
      setResult(doc);
    } catch (e) {
      toast.error("Search failed", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async (srNo, shouldVerify) => {
    if (!result?._id) return;
    try {
      setVerifyingSrNo(srNo);
      const res = await api.patch(
        `/api/fuel-requisitions/${result._id}/items/${srNo}/verification`,
        { verified: shouldVerify }
      );
      setResult(res.data);
      if (shouldVerify) {
        toast.success("Line item verified", { description: `Line ${srNo} is now marked as verified.` });
      } else {
        toast.info("Line item unverified", { description: `Line ${srNo} has been returned to pending.` });
      }
    } catch (err) {
      toast.error("Failed to update verification", { description: err.message || "Could not update verification." });
    } finally {
      setVerifyingSrNo(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) {
      toast.warning("Nothing to export", { description: "Run a search before downloading." });
      return;
    }

    try {
      const user = result.user || {};
      const monthLabel = [result.month || filters.month, result.year || filters.year].filter(Boolean).join(", ");
      const displayName = selectedUser?.fullName || user.fullName || "employee";

      const infoRows = [
        { label: "Name", value: user.fullName || "-" },
        { label: "Employee ID", value: user.employeeId ?? "-" },
        { label: "Email", value: user.email || "-" },
        { label: "Department", value: user.department || "-" },
        { label: "Designation", value: user.designation || "-" },
        { label: "Branch/City", value: user.branch ? `${user.branch}${user.city ? `, ${user.city}` : ""}` : user.city || "-" },
      ];

      const allItems = result.items || [];
      const verifiedItems = allItems.filter((item) => item.verified);
      const items = allItems.map((r, idx) => {
        const km = Number(r.km) || 0;
        const rate = Number(r.rate) || 0;
        const amount = Number.isFinite(r.amount) ? Number(r.amount) : km * rate;
        const dateStr = r.date ? new Date(r.date).toLocaleDateString() : "";
        return [
          String(r.srNo ?? idx + 1),
          [dateStr, r.description || ""].filter(Boolean).join("\n"),
          km ? km.toLocaleString() : "0",
          rate ? rate.toLocaleString() : "0",
          amount ? amount.toLocaleString() : "0",
          r.verified ? "Verified" : "Pending",
        ];
      });

      const totalsKm = verifiedItems.reduce((sum, r) => sum + (Number(r.km) || 0), 0);
      const totalsAmount = verifiedItems.reduce((sum, r) => {
        const km = Number(r.km) || 0;
        const rate = Number(r.rate) || 0;
        const amount = Number.isFinite(r.amount) ? Number(r.amount) : km * rate;
        return sum + amount;
      }, 0);

      const primaryText = [34, 34, 34];
      const textMuted = [102, 102, 102];
      const subtleBackground = [247, 247, 247];
      const lineColor = [210, 210, 210];

      const buildPdf = (densityIndex) => {
        const layout = LAYOUT_STEPS[Math.min(densityIndex, LAYOUT_STEPS.length - 1)];
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = layout.margin;
        const contentWidth = pageWidth - margin * 2;
        const headerMonth = `Month: ${monthLabel || "-"}`;
        const headerY = margin;

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...primaryText);
        pdf.setFontSize(layout.headerFont);
        pdf.text("Fuel Requisition", margin, headerY);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(layout.subFont);
        pdf.setTextColor(...primaryText);
        pdf.text(headerMonth, pageWidth - margin - pdf.getTextWidth(headerMonth), headerY);

        let cursorY = headerY + layout.headerFont + 4;
        pdf.setDrawColor(...lineColor);
        pdf.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 6;

        pdf.setFontSize(layout.titleFont);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...primaryText);
        pdf.text("Requisition Form", margin, cursorY);

        cursorY += layout.subFont + 1;

        const infoTop = cursorY;
        const columns = 3;
        const perColumn = Math.ceil(infoRows.length / columns);
        const columnWidth = contentWidth / columns;
        const infoBoxHeight = perColumn * layout.infoRowHeight + 4;

        pdf.setFillColor(...subtleBackground);
        pdf.setDrawColor(...lineColor);
        pdf.roundedRect(margin, infoTop, contentWidth, infoBoxHeight, 3, 3, "F");
        pdf.roundedRect(margin, infoTop, contentWidth, infoBoxHeight, 3, 3);

        infoRows.forEach((item, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);
          const baseX = margin + column * columnWidth + 3;
          const baseY = infoTop + 5 + row * layout.infoRowHeight;

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(layout.infoLabel);
          pdf.setTextColor(...primaryText);
          pdf.text(item.label, baseX, baseY);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(layout.infoValue);
          pdf.setTextColor(...textMuted);
          const valueLines = pdf.splitTextToSize(String(item.value ?? "-"), columnWidth - 6);
          pdf.text(valueLines, baseX, baseY + 3.4);
        });
        pdf.setTextColor(...primaryText);

        cursorY = infoTop + infoBoxHeight + 4;

        pdf.setDrawColor(...lineColor);
        pdf.line(margin, cursorY, pageWidth - margin, cursorY);
        cursorY += 3;

        const colSr = 12;
        const colKm = 16;
        const colRate = 16;
        const colAmount = 22;
        const colStatus = 24;
        const colDesc = Math.max(40, contentWidth - (colSr + colKm + colRate + colAmount + colStatus));

        const footRow = verifiedItems.length
          ? [[ "", "Verified totals", totalsKm.toLocaleString(), "", totalsAmount.toLocaleString(), `${verifiedItems.length}/${allItems.length} verified` ]]
          : undefined;

        autoTable(pdf, {
          startY: cursorY,
          head: [["Sr No", "Description", "KM", "Rate", "Amount", "Status"]],
          body: items,
          foot: footRow,
          theme: "grid",
          tableWidth: contentWidth,
          styles: {
            font: "helvetica",
            fontSize: layout.tableFont,
            cellPadding: layout.padding,
            lineHeight: layout.lineHeight,
            overflow: "linebreak",
            valign: "middle",
            lineColor,
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: primaryText,
            fontStyle: "bold",
            halign: "center",
            fontSize: layout.headFont,
          },
          columnStyles: {
            0: { cellWidth: colSr, halign: "center" },
            1: { cellWidth: colDesc },
            2: { cellWidth: colKm, halign: "right" },
            3: { cellWidth: colRate, halign: "right" },
            4: { cellWidth: colAmount, halign: "right" },
            5: { cellWidth: colStatus, halign: "center" },
          },
          footStyles: footRow ? {
            fillColor: [242, 242, 242],
            textColor: primaryText,
            fontStyle: "bold",
            fontSize: layout.tableFont,
          } : undefined,
          margin: { left: margin, right: margin },
          rowPageBreak: "avoid",
          pageBreak: "avoid",
        });

        const tableBottom = pdf.lastAutoTable?.finalY ?? cursorY;
        const metaTopLimit = pageHeight - 18 - 8;
        let metaCursorY = Math.min(tableBottom + 3, metaTopLimit);

        if (metaCursorY <= metaTopLimit) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(layout.noteFont);
          pdf.setTextColor(...textMuted);
          pdf.text("Totals reflect only verified line items.", margin, metaCursorY);
          pdf.setTextColor(...primaryText);
          metaCursorY += 3;
        }

        if (metaCursorY <= metaTopLimit) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(layout.subFont);
          const created = result.createdAt
            ? `Created: ${new Date(result.createdAt).toLocaleString()}`
            : "Created: -";
          pdf.setTextColor(...textMuted);
          pdf.text(created, pageWidth - margin - pdf.getTextWidth(created), metaCursorY);
          pdf.setTextColor(...primaryText);
          metaCursorY += 3.5;
        }

        if (result.remarks && metaCursorY <= metaTopLimit) {
          pdf.setFontSize(layout.subFont);
          pdf.text(`Remarks: ${result.remarks}`, margin, metaCursorY, { maxWidth: contentWidth });
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(layout.subFont);
        pdf.setLineWidth(0.25);
        pdf.text("Approved / Checked by:", margin, pageHeight - 18);
        pdf.line(margin, pageHeight - 16.7, margin + 58, pageHeight - 16.7);

        const sigX = pageWidth - margin - 58;
        pdf.text("Signature:", sigX, pageHeight - 18);
        pdf.line(sigX, pageHeight - 16.7, sigX + 58, pageHeight - 16.7);

        return pdf;
      };

      const startingIndex = (() => {
        if (allItems.length > 30) return 2;
        if (allItems.length > 20) return 1;
        return 0;
      })();

      const finalizePdf = (densityIndex) => {
        const candidate = buildPdf(densityIndex);
        if (candidate.getNumberOfPages() > 1 && densityIndex < LAYOUT_STEPS.length - 1) {
          return finalizePdf(densityIndex + 1);
        }
        return candidate;
      };

      const pdf = finalizePdf(startingIndex);

      if (pdf.getNumberOfPages() > 1) {
        toast.warning("Report still spans multiple pages.", { description: "Location has more rows than can fit on one sheet." });
      }

      pdf.save(`FuelRequisition_${monthLabel || filters.month}_${result.year || filters.year}_${displayName}.pdf`);
    } catch (err) {
      toast.error("PDF failed", { description: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Fuel Requisition Report (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select
                value={filters.user}
                onValueChange={(v) => setFilters((f) => ({ ...f, user: v }))}
                disabled={loadingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading..." : "Select employee"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableUsers.map((u) => (
                    <SelectItem key={u._id} value={String(u._id)}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Month</Label>
              <Select
                value={filters.month}
                onValueChange={(v) => setFilters((f) => ({ ...f, month: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Year</Label>
              <Input
                type="number"
                value={filters.year}
                onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={loading || loadingUsers}>
                {loading ? "Loading…" : "View Requisition"}
              </Button>
            </div>
          </form>

          {selectedUser ? (
            <p className="text-xs text-muted-foreground mt-2">
              Viewing for <span className="font-medium">{selectedUser.fullName}</span> • {filters.month} {filters.year}
            </p>
          ) : null}

          <Separator className="my-6" />

          {result ? (
            <div>
              <div>
                <FuelRequisitionView
                  key={result?._id}
                  data={result}
                  adminMode
                  onToggleVerification={handleToggleVerification}
                  verifyingSrNo={verifyingSrNo}
                  onUpdated={(doc) => setResult(doc)}   // <- refresh parent state after inline edits
                />
                <div className="mt-8 flex flex-col gap-6 text-sm font-medium md:flex-row md:items-center md:justify-between">
                  <div>Approved / Checked by: ____________________</div>
                  <div>Signature: ____________________</div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleDownloadPDF}>Download PDF</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              select a user (only those who have requisitions are listed) and pick month/year.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
