// src/components/pdf/DownloadPdfButton.js
import { PDFDownloadLink } from "@react-pdf/renderer";
import PdfLayout from "./PdfLayout";

export default function DownloadPdfButton({
  filename = "backfill-report.pdf",
  title,
  rows,
  generatedAt,
  className,
}) {
  const doc = <PdfLayout title={title} rows={rows} generatedAt={generatedAt} />;

  return (
    <PDFDownloadLink document={doc} fileName={filename}>
      {({ loading }) => (
        <button
          type="button"
          className={className}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "transform .05s ease",
          }}
          disabled={loading}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "Building PDF…" : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
