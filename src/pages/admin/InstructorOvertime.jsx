// src/pages/AdminInstructorOvertime.jsx
import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { useInstructorOvertime } from "@/hooks/useInstructorOvertime";
import AdminFilters from "@/components/Instructorovertime/admin/AdminFilters";
import PayoutSummary from "@/components/Instructorovertime/admin/PayoutSummary";
import ClaimsAdminTable from "@/components/Instructorovertime/admin/ClaimsAdminTable";
import { Button } from "@/components/ui/button";
import { formatRs } from "@/utils/money";
import { formatDateLabel, minutesToHuman } from "@/utils/time";
import { calcOvertimePayout } from "@/utils/overtime";

export default function AdminInstructorOvertime() {
  const {
    claims,
    loading,
    saving,
    fetchClaims,
    updateClaim,
    fetchMonthlyReport,
  } = useInstructorOvertime();

  // filters: month (YYYY-MM) + instructor
  const [filters, setFilters] = React.useState({ month: "", instructorId: "" });
  const [downloading, setDownloading] = React.useState(false);

  // optional: initial fetch; you can remove if you prefer a blank screen before Apply
  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  // instructor dropdown options
  const instructorOptions = React.useMemo(() => {
    const map = new Map();
    for (const c of claims || []) {
      const id =
        c.instructorId ||
        c.instructor?._id ||
        c.instructorIdStr ||
        c.instructor?.id;
      const name = c.instructorName || c.instructor?.fullName || "Unknown";
      if (id && !map.has(id)) map.set(id, name);
    }
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [claims]);

  const handleFilterChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e;
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = async () => {
    const { instructorId, month } = filters;
    if (!instructorId || !month) return;

    // month is "YYYY-MM" -> parse to year & 1-based month
    const [yyyy, mm] = month.split("-");
    const year = Number(yyyy);
    const monthNum = Number(mm);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    )
      return;

    try {
      await fetchMonthlyReport({ year, month: monthNum, instructorId });
    } catch {}
  };

  const resetFilters = async () => {
    setFilters({ month: "", instructorId: "" });
    // optional: clear table or show all again
    // await fetchClaims({});  // <- uncomment if you want "all claims" after reset
  };

  const totalPayoutForSelection = React.useMemo(() => {
    return (claims || []).reduce((sum, c) => {
      const p = calcOvertimePayout(c);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0);
  }, [claims]);

  const verifiedClaims = React.useMemo(
    () => (Array.isArray(claims) ? claims.filter((claim) => claim?.verified) : []),
    [claims],
  );

  const totalVerifiedPayout = React.useMemo(() => {
    return verifiedClaims.reduce((sum, claim) => {
      const payout = calcOvertimePayout(claim);
      return sum + (Number.isFinite(payout) ? payout : 0);
    }, 0);
  }, [verifiedClaims]);

  const selectedInstructorLabel = React.useMemo(() => {
    if (!filters.instructorId) return "All Instructors";
    const match = instructorOptions.find(
      (option) => String(option.value) === String(filters.instructorId),
    );
    return match?.label ?? "Selected Instructor";
  }, [filters.instructorId, instructorOptions]);

  const formattedMonthLabel = React.useMemo(() => {
    if (!filters.month) return "";
    const [yyyy, mm] = filters.month.split("-");
    if (!yyyy || !mm) return "";

    const monthIndex = Number(mm) - 1;
    if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return "";

    const date = new Date(Date.UTC(Number(yyyy), monthIndex));
    return date.toLocaleDateString([], { month: "long", year: "numeric" });
  }, [filters.month]);

  const handleDownloadPdf = React.useCallback(() => {
    if (!verifiedClaims.length || downloading) return;

    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Decorative header band
      doc.setFillColor(17, 45, 78);
      doc.rect(0, 0, pageWidth, 90, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Overtime Payout Report", 40, 45);

      doc.setFontSize(12);
      doc.text(`Instructor: ${selectedInstructorLabel}`, 40, 65);
      if (formattedMonthLabel) {
        doc.text(`Month: ${formattedMonthLabel}`, 40, 80);
      }

      doc.text(`Total Verified: ${formatRs(totalVerifiedPayout)}`, pageWidth - 40, 65, {
        align: "right",
      });
      doc.text(
        `Generated: ${new Date().toLocaleDateString([], {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}`,
        pageWidth - 40,
        80,
        { align: "right" },
      );

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text("Verified Overtime Entries", 40, 120);

      autoTable(doc, {
        startY: 135,
        head: [["Date", "Branch", "Duration", "Payout", "Notes"]],
        body: verifiedClaims.map((claim) => [
          formatDateLabel(claim.date),
          claim.branchName || "--",
          minutesToHuman(claim.totalDurationMinutes),
          formatRs(calcOvertimePayout(claim)),
          claim.notes?.trim() || "--",
        ]),
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
          textColor: [55, 65, 81],
          lineColor: [229, 231, 235],
          lineWidth: 0.4,
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 120 },
          2: { cellWidth: 90, halign: "center" },
          3: { cellWidth: 100, halign: "right" },
          4: { cellWidth: "auto" },
        },
      });

      const finalY = doc.lastAutoTable?.finalY ?? 135;

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(
        "Only verified claims are included in this report. Please retain for payroll records.",
        40,
        finalY + 30,
      );

      const filenameParts = ["overtime", filters.month || "report", filters.instructorId || "all"];
      const filename = `${filenameParts.filter(Boolean).join("_")}.pdf`;
      doc.save(filename);
    } finally {
      setDownloading(false);
    }
  }, [
    downloading,
    filters.instructorId,
    filters.month,
    formattedMonthLabel,
    selectedInstructorLabel,
    totalVerifiedPayout,
    verifiedClaims,
  ]);

  const setVerified = async (id, next) => {
    try {
      await updateClaim(id, { verified: !!next });
    } catch {}
  };

  const canShowSummary = Boolean(filters.instructorId && filters.month);
  const canDownloadPdf = Boolean(verifiedClaims.length) && !downloading;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Instructor Overtime Claims
        </h1>
        <p className="text-sm text-muted-foreground">
          Review, verify, and see payouts.
        </p>
      </header>

      <AdminFilters
        filters={filters}
        instructorOptions={instructorOptions}
        loading={loading}
        onChange={handleFilterChange}
        onApply={applyFilters}
        onReset={resetFilters}
        onRefresh={() => fetchClaims()}
      />

      <PayoutSummary show={canShowSummary} total={totalPayoutForSelection} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Submitted claims</h2>
            {loading && (
              <span className="text-sm text-muted-foreground">Loading...</span>
            )}
          </div>

          <Button
            onClick={handleDownloadPdf}
            disabled={!canDownloadPdf}
            variant="outline"
            className="gap-2"
          >
            <Download className="size-4" />
            {downloading ? "Preparing..." : "Download PDF"}
          </Button>
        </div>

        <ClaimsAdminTable
          claims={claims}
          loading={loading}
          saving={saving}
          onToggleVerified={setVerified}
        />
      </section>
    </div>
  );
}
