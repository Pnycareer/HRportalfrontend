// src/pages/FuelRequisitionReport.jsx
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
          toast.error("Failed to load requisitions", {
            description: e.message,
          });
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
      toast.warning("Pick a user", {
        description: "Select an employee to view their requisition.",
      });
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
        toast.info("No requisition found", {
          description: "Nothing matches that employee, month, and year.",
        });
      }
      setResult(doc);
    } catch (e) {
      toast.error("Search failed", {
        description: e.message,
      });
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
        toast.success("Line item verified", {
          description: `Line ${srNo} is now marked as verified.`,
        });
      } else {
        toast.info("Line item unverified", {
          description: `Line ${srNo} has been returned to pending.`,
        });
      }
    } catch (err) {
      toast.error("Failed to update verification", {
        description: err.message || "Could not update verification.",
      });
    } finally {
      setVerifyingSrNo(null);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) {
      toast.warning("Nothing to export", {
        description: "Run a search before downloading.",
      });
      return;
    }

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // <- usable width
      let cursorY = 20;

      const user = result.user || {};
      const monthLabel = [result.month || filters.month, result.year || filters.year].filter(Boolean).join(", ");
      const displayName = selectedUser?.fullName || user.fullName || "employee";

      const infoRows = [
        { label: "Name", value: user.fullName || "-" },
        { label: "Employee ID", value: user.employeeId ?? "-" },
        { label: "Email", value: user.email || "-" },
        { label: "Department", value: user.department || "-" },
        { label: "Designation", value: user.designation || "-" },
        {
          label: "Branch/City",
          value: user.branch ? `${user.branch}${user.city ? `, ${user.city}` : ""}` : user.city || "-",
        },
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

      const accentColor = [54, 99, 143]; // deep slate blue
      const lightAccent = [241, 246, 251];
      const textMuted = [95, 99, 104];

      // Header bar
      pdf.setFillColor(...accentColor);
      pdf.rect(0, 0, pageWidth, 20, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Fuel Requisition", margin, 13);
      const headerMonth = `Month: ${monthLabel || "-"}`;
      pdf.setFontSize(12);
      const headerMonthWidth = pdf.getTextWidth(headerMonth);
      pdf.text(headerMonth, pageWidth - margin - headerMonthWidth, 13);

      // Title + employee chip
      cursorY = 32;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("Requisition Form", margin, cursorY);

      cursorY += 9;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(...textMuted);
      pdf.text(`Employee: ${displayName}`, margin, cursorY);

      cursorY += 8;

      // Info box
      const boxTop = cursorY;
      const boxWidth = contentWidth;
      pdf.setFillColor(...lightAccent);
      pdf.roundedRect(margin, boxTop, boxWidth, 38, 4, 4, "F");
      pdf.setDrawColor(225, 229, 234);
      pdf.roundedRect(margin, boxTop, boxWidth, 38, 4, 4);

      const columnPairs = [
        [infoRows[0], infoRows[1]],
        [infoRows[2], infoRows[3]],
        [infoRows[4], infoRows[5]],
      ];

      const pairWidth = boxWidth / columnPairs.length;
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);

      columnPairs.forEach((pair, idx) => {
        const baseX = margin + idx * pairWidth + 8;
        let baseY = boxTop + 11;

        pair.forEach((item, rowIdx) => {
          if (!item) return;
          pdf.setFont("helvetica", "bold");
          pdf.text(`${item.label}`, baseX, baseY);
          pdf.setFont("helvetica", "normal");
          const valueLines = pdf.splitTextToSize(String(item.value ?? "-"), pairWidth - 16);
          const valueY = baseY + 5;
          pdf.text(valueLines, baseX, valueY);
          baseY = valueY + valueLines.length * 5.2 + 4;
          if (rowIdx === 0) {
            pdf.setDrawColor(220, 224, 229);
            pdf.setLineWidth(0.2);
            pdf.line(baseX - 2, baseY - 2, baseX - 2 + pairWidth - 16, baseY - 2);
          }
        });
      });

      cursorY = boxTop + 42;

      pdf.setDrawColor(225, 229, 234);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;

      // ------- AUTO TABLE (FIXED WIDTHS THAT FIT CONTENT AREA) -------
      // Make sure all column widths add up to contentWidth
      const colSr = 12;
      const colKm = 18;
      const colRate = 18;
      const colAmount = 24;
      const colStatus = 24;
      const colDesc = contentWidth - (colSr + colKm + colRate + colAmount + colStatus); // dynamic

      autoTable(pdf, {
        startY: cursorY,
        head: [["Sr No", "Description", "KM", "Rate", "Amount", "Status"]],
        body: items,
        foot: [["", "Verified totals", totalsKm.toLocaleString(), "", totalsAmount.toLocaleString(), `${verifiedItems.length}/${allItems.length} verified`]],
        theme: "grid",
        tableWidth: contentWidth,          // <-- keep it inside margins
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 3,
          overflow: "linebreak",
          lineColor: [220, 220, 220],
          lineWidth: 0.25,
        },
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: colSr, halign: "center" },
          1: { cellWidth: colDesc },                 // fills the remaining space
          2: { cellWidth: colKm, halign: "right" },
          3: { cellWidth: colRate, halign: "right" },
          4: { cellWidth: colAmount, halign: "right" },
          5: { cellWidth: colStatus, halign: "center" },
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 1) {
            pdf.setFont("helvetica", "normal");
          }
        },
        margin: { left: margin, right: margin }, // ensure plugin respects margins
      });

      cursorY = (pdf.lastAutoTable?.finalY || cursorY) + 10;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text("Totals reflect only verified line items.", margin, cursorY);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      cursorY += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      const created = result.createdAt
        ? `Created: ${new Date(result.createdAt).toLocaleString()}`
        : "Created: -";
      const createdWidth = pdf.getTextWidth(created);
      pdf.text(created, pageWidth - margin - createdWidth, cursorY);
      cursorY += 8;

      if (result.remarks) {
        pdf.text(`Remarks: ${result.remarks}`, margin, cursorY, { maxWidth: contentWidth });
        cursorY += 10;
      }

      const signatureY = Math.max(cursorY, pageHeight - 30);
      pdf.setFont("helvetica", "bold");
      pdf.text("Approved / Checked by:", margin, signatureY);
      pdf.setLineWidth(0.3);
      pdf.line(margin, signatureY + 2, margin + 70, signatureY + 2);

      const signatureLabel = "Signature:";
      const sigX = pageWidth - margin - 70;
      pdf.text(signatureLabel, sigX, signatureY);
      pdf.line(sigX, signatureY + 2, sigX + 70, signatureY + 2);

      pdf.save(`FuelRequisition_${monthLabel || filters.month}_${result.year || filters.year}_${displayName}.pdf`);
    } catch (err) {
      toast.error("PDF failed", {
        description: err.message,
      });
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
              <Select value={filters.month} onValueChange={(v) => setFilters((f) => ({ ...f, month: v }))}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))} />
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
