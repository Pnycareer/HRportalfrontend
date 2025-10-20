// src/components/employees/EmployeesTable.jsx
import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
// ❌ remove these if unused now
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Pencil, Trash2 } from "lucide-react";

// const ROLES = ["superadmin", "admin", "hr", "employee"]; // ❌ not needed now

export default function EmployeesTable({
  rows = [],
  onEdit,
  onDelete,
  // onChangeRole,  // ❌ remove
  onApprove,
  onReject,
}) {
  const [toDelete, setToDelete] = React.useState(null);

  if (!rows.length) {
    return (
      <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
        No employees found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TableRow>
              <TableHead className="w-[260px]">Full Name</TableHead>
              <TableHead className="w-[120px]">Employee ID</TableHead>
              <TableHead className="w-[260px]">Email</TableHead>
              <TableHead className="w-[160px]">Department</TableHead>
              <TableHead className="w-[180px]">Role</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead className="w-[220px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((u) => (
              <TableRow
                key={u._id}
                className="odd:bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <TableCell className="font-medium">
                  <div className="max-w-[240px] truncate">{u.fullName}</div>
                </TableCell>

                <TableCell className="text-muted-foreground">{u.employeeId}</TableCell>

                <TableCell>
                  <div className="max-w-[240px] truncate">{u.email}</div>
                </TableCell>

                <TableCell>
                  <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium">
                    {u.department || "—"}
                  </span>
                </TableCell>

                {/* ✅ Role now read-only */}
                <TableCell>
                  <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium capitalize">
                    {u.role || "—"}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    {u.isApproved ? (
                      <StatusChip kind="success" label="Approved" icon={Check} />
                    ) : (
                      <StatusChip kind="warn" label="Pending" />
                    )}

                    {!u.isApproved ? (
                      <Button
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onApprove?.(u)}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 px-2"
                        onClick={() => onReject?.(u)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => onEdit?.(u)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8"
                      onClick={() => setToDelete(u)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm Delete */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can’t be undone. It will permanently remove{" "}
              <span className="font-medium">{toDelete?.fullName}</span> from your
              workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const id = toDelete?._id;
                setToDelete(null);
                onDelete?.(id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusChip({ kind = "neutral", label, icon: Icon }) {
  const cls =
    kind === "success"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : kind === "warn"
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium " +
        cls
      }
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}
