import React from "react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

const PROFILE_FIELDS = [
  ["Full Name", "fullName"],
  ["Employee ID", "employeeId"],
  ["Email", "email"],
  ["Phone", "phone"],
  ["Department", "department"],
  ["Designation", "designation"],
  ["Branch", "branch"],
  ["Manager", "reportingManager"],
  ["Joined", "dateOfJoining"],
  ["Status", "status"],
];

export default function UserProfilePdfButton({
  user,
  summary,
  attendanceDays = [],
  monthLabel,
  year,
  className,
  children,
  variant = "outline",
  size = "sm",
}) {
  const handleDownload = React.useCallback(() => {
    if (!user) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    const reportTitle = `${user.fullName || "Employee"} | Profile Digest`;
    const reportSubtitle = [
      monthLabel && year ? `Period: ${monthLabel} ${year}` : null,
      user.department ? `Department: ${user.department}` : null,
      user.branch ? `Branch: ${user.branch}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const drawChrome = (pageNumber) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

      const gradientSteps = 10;
      for (let i = 0; i < gradientSteps; i++) {
        const shade = 246 - i * 4;
        doc.setFillColor(shade, shade, 255);
        doc.rect(margin / 2, margin / 2 + i * 4, pageWidth - margin, 4, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(35, 45, 65);
      doc.text(reportTitle, margin, margin + 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(105, 115, 135);
      if (reportSubtitle) {
        doc.text(reportSubtitle, margin, margin + 38);
      }

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 160);
      doc.text(
        `Page ${pageNumber}`,
        pageWidth - margin - 42,
        pageHeight - margin / 2
      );
    };

    drawChrome(1);

    const profileRows = PROFILE_FIELDS.map(([label, key]) => {
      const value = user?.[key];
      if (value == null || value === "") return null;
      return [label, String(value)];
    }).filter(Boolean);

    autoTable(doc, {
      startY: margin + 58,
      theme: "plain",
      styles: {
        fontSize: 10,
        textColor: [55, 65, 81],
        cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [17, 24, 39], cellWidth: 150 },
      },
      body: profileRows.length
        ? profileRows
        : [["Profile", "No additional profile details available."]],
    });

    const statsRows = [
      ["Days Marked", summary?.daysMarked ?? "--"],
      ["Present", summary?.totals?.present ?? 0],
      ["Late", summary?.totals?.late ?? 0],
      ["Absent", summary?.totals?.absent ?? 0],
      ["Leave", summary?.totals?.leave ?? 0],
      ["Official Off", summary?.totals?.official_off ?? 0],
      ["Short Leave", summary?.totals?.short_leave ?? 0],
      ["Worked Hours", (summary?.workedHours ?? 0).toFixed(2)],
      ["Average Hours", (summary?.avgHours ?? 0).toFixed(2)],
    ];

    const statsTitleY = doc.lastAutoTable
      ? doc.lastAutoTable.finalY + 26
      : margin + 70;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(35, 45, 65);
    doc.text("Attendance Summary", margin, statsTitleY);

    autoTable(doc, {
      startY: statsTitleY + 10,
      theme: "grid",
      styles: {
        fontSize: 10,
        textColor: [35, 45, 65],
        fillColor: [249, 250, 255],
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      body: statsRows,
    });

    const attendanceTitleY = doc.lastAutoTable.finalY + 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(35, 45, 65);
    doc.text("Attendance Log", margin, attendanceTitleY);

    const attendanceRows = attendanceDays.map((entry) => [
      formatDate(entry.date),
      formatStatus(entry.status),
      hhmmOrDash(entry.checkIn),
      hhmmOrDash(entry.checkOut),
      entry.workedHours != null ? Number(entry.workedHours).toFixed(2) : "--",
      entry.note?.trim() ? entry.note : "--",
    ]);

    autoTable(doc, {
      startY: attendanceTitleY + 12,
      theme: "grid",
      head: [["Date", "Status", "Check-in", "Check-out", "Worked (h)", "Note"]],
      body: attendanceRows.length
        ? attendanceRows
        : [["--", "--", "--", "--", "--", "No attendance records available."]],
      styles: {
        fontSize: 9,
        textColor: [35, 45, 65],
        cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [45, 55, 72],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      margin: { top: margin, bottom: margin },
      didDrawPage: ({ pageNumber }) => {
        if (pageNumber === 1) return;
        drawChrome(pageNumber);
      },
    });

    const filenameParts = [
      "profile",
      slug(user.fullName || user.email || user._id),
      monthLabel && year ? `${slug(monthLabel)}-${year}` : null,
    ]
      .filter(Boolean)
      .join("_");

    doc.save(`${filenameParts || "profile"}.pdf`);
  }, [attendanceDays, monthLabel, summary, user, year]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleDownload}
      disabled={!user}
    >
      <Download className="h-4 w-4" />
      {children || "Download Profile PDF"}
    </Button>
  );
}

function hhmmOrDash(value) {
  return value && value.length ? value : "--";
}

function formatStatus(value) {
  if (!value) return "--";
  return String(value)
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value ?? "--";
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}
