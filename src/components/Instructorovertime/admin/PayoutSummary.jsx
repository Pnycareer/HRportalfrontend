// src/components/overtime/PayoutSummary.jsx
import React from "react";
import { formatRs } from "@/utils/money";

export default function PayoutSummary({ show, total }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      <span className="font-medium">Total Calculated Payout for selection: </span>
      <span className="font-semibold">{formatRs(total)}</span>
    </div>
  );
}
