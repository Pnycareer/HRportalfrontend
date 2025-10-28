// src/components/overtime/ClaimsAdminTable.jsx
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { minutesToHuman, formatDateLabel } from "@/utils/time";
import { formatRs } from "@/utils/money";
import { calcOvertimePayout } from "@/utils/overtime";
import SlotsPills from "./SlotsPills";
import StatusToggle from "./StatusToggle";

export default function ClaimsAdminTable({ claims = [], loading, saving, onToggleVerified }) {
  if (!claims.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No overtime claims found for the selected filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border flex justify-center">
      <Table className="table-fixed w-full text-center">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[140px] text-center">Instructor</TableHead>
            <TableHead className="w-[140px] text-center">Date</TableHead>
            <TableHead className="w-[120px] text-center">Designation</TableHead>
            <TableHead className="w-[140px] text-center">Branch</TableHead>
            <TableHead className="w-[110px] text-center">Total min</TableHead>
            <TableHead className="w-[280px] text-center">Slots</TableHead>
            <TableHead className="w-[140px] text-center">Monthly Salary</TableHead>
            <TableHead className="w-[140px] text-center">Calculated Payout</TableHead>
            <TableHead className="w-[220px] text-center">Notes</TableHead>
            <TableHead className="w-[120px] text-center">Status</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {claims.map((claim) => {
            const monthly = claim?.salary ?? claim?.instructor?.salary ?? null;
            const payout = calcOvertimePayout(claim);
            const isVerified = !!claim.verified;

            return (
              <TableRow key={claim._id} className="align-middle text-center">
                <TableCell className="font-medium">
                  {claim.instructorName || claim.instructor?.fullName || "--"}
                </TableCell>

                <TableCell>{formatDateLabel(claim.date)}</TableCell>

                <TableCell>
                  {claim.designation || claim.instructor?.designation || "--"}
                </TableCell>

                <TableCell>{claim.branchName || "--"}</TableCell>

                <TableCell className="font-medium tabular-nums">
                  {minutesToHuman(claim.totalDurationMinutes)}
                </TableCell>

                <TableCell>
                  <SlotsPills slots={claim.overtimeSlots} />
                </TableCell>

                <TableCell className="tabular-nums font-medium">
                  {monthly != null ? formatRs(Number(monthly)) : "--"}
                </TableCell>

                <TableCell className="font-semibold tabular-nums">
                  {formatRs(payout)}
                </TableCell>

                <TableCell className="whitespace-normal">
                  {claim.notes?.trim() || "--"}
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <StatusToggle
                    verified={isVerified}
                    saving={saving}
                    onToggle={(next) => onToggleVerified(claim._id, next)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
