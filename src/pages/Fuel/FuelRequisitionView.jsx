// src/components/FuelRequisitionView.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUS_OPTIONS = ["submitted","draft"]; // backend is free-form; these are common options

function fmtDate(d) {
  const dt = d ? new Date(d) : null;
  if (!dt || isNaN(dt.getTime())) return null;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function FuelRequisitionView({
  id,
  data,
  adminMode = false,
  onToggleVerification,
  verifyingSrNo = null,
  onDeleted,          // optional: parent callback after delete
  onUpdated,          // optional: parent callback after successful edit
}) {
  const [doc, setDoc] = useState(data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editModel, setEditModel] = useState({ month: "", year: "", status: "", remarks: "" });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingSrNo, setRemovingSrNo] = useState(null);

  useEffect(() => {
    if (data) {
      setDoc(data);
      setLoading(false);
      setError("");
    }
  }, [data]);

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (!id || data) return;
      try {
        setLoading(true);
        const res = await api.get(`/api/fuel-requisitions/${id}`);
        if (!ignore) setDoc(res.data);
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load requisition");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => { ignore = true; };
  }, [id, data]);

  const totals = useMemo(() => {
    if (!doc) return { km: 0, amount: 0, verifiedKm: 0, verifiedAmount: 0 };
    const allItems = doc.items || [];
    const km = typeof doc.totalKm === "number"
      ? doc.totalKm
      : allItems.reduce((s, r) => s + (Number(r.km) || 0), 0);
    const amount = typeof doc.totalAmount === "number"
      ? doc.totalAmount
      : allItems.reduce((s, r) => s + ((Number(r.amount) || (Number(r.km) || 0) * (Number(r.rate) || 0))), 0);
    const verifiedKm = allItems.reduce(
      (s, r) => r.verified ? s + (Number(r.km) || 0) : s,
      0
    );
    const verifiedAmount = allItems.reduce(
      (s, r) => r.verified
        ? s + (Number.isFinite(r.amount) ? Number(r.amount) : (Number(r.km) || 0) * (Number(r.rate) || 0))
        : s,
      0
    );
    return { km, amount, verifiedKm, verifiedAmount };
  }, [doc]);

  // ----- edit / delete handlers -----
  const beginEdit = () => {
    if (!doc) return;
    setEditModel({
      month: doc.month || "",
      year: doc.year || new Date().getFullYear(),
      status: doc.status || "",
      remarks: doc.remarks || "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = async () => {
    if (!doc?._id) return;
    try {
      setBusy(true);
      const payload = {
        month: editModel.month,
        year: Number(editModel.year),
        status: editModel.status,
        remarks: editModel.remarks,
      };
      const res = await api.patch(`/api/fuel-requisitions/${doc._id}`, payload);
      setDoc(res.data);
      setIsEditing(false);
      toast.success("Requisition updated successfully.");
      onUpdated?.(res.data);
    } catch (e) {
      toast.error("Failed to update requisition", {
        description: e.message || "Could not update.",
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmAndDelete = async () => {
    if (!doc?._id) return;
    if (!window.confirm("Delete this requisition? This can’t be undone.")) return;
    try {
      setDeleting(true);
      await api.delete(`/api/fuel-requisitions/${doc._id}`);
      toast.success("Requisition removed.");
      onDeleted?.(doc._id);
      // if this is a single view, just blank it out
      setDoc(null);
    } catch (e) {
      toast.error("Failed to delete requisition", {
        description: e.message || "Could not delete.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const removeLineItem = async (srNo) => {
    if (!doc?._id) return;
    if (!window.confirm(`Remove line #${srNo}?`)) return;
    try {
      setRemovingSrNo(srNo);
      const res = await api.delete(`/api/fuel-requisitions/${doc._id}/items/${srNo}`);
      setDoc(res.data);
      toast.success(`Item #${srNo} deleted.`);
      onUpdated?.(res.data);
    } catch (e) {
      toast.error("Failed to remove line item", {
        description: e.message || "Could not remove line.",
      });
    } finally {
      setRemovingSrNo(null);
    }
  };

  // ----- render -----
  if (loading) return <div className="text-sm text-muted-foreground">loading requisition…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!doc) return null;

  const user = doc.user || {};
  const monthLabel = `${doc.month || ""}${doc.year ? `, ${doc.year}` : ""}`;
  const items = doc.items || [];
  const verifiedCount = items.filter((it) => it.verified).length;

  const showOwnerActions = !adminMode; // employees edit their own; backend enforces auth anyway

  return (
    <Card className="mt-8 print:shadow-none">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold">Requisition Form</h1>
            <div className="text-muted-foreground">Employee: {user.fullName || "-"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xl md:text-2xl font-bold">Month: {monthLabel}</div>
          </div>
        </div>

        {/* Owner actions */}
        {showOwnerActions ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                <Button size="sm" onClick={beginEdit}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={confirmAndDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>Cancel</Button>
              </>
            )}
          </div>
        ) : null}

        {/* Inline editor */}
        {isEditing ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-md border p-3">
            <div className="space-y-1">
              <div className="text-xs font-medium">Month</div>
              <Select value={editModel.month} onValueChange={(v) => setEditModel((m) => ({ ...m, month: v }))}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium">Year</div>
              <Input
                type="number"
                value={editModel.year}
                onChange={(e) => setEditModel((m) => ({ ...m, year: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium">Status</div>
              <Select
                value={editModel.status}
                onValueChange={(v) => setEditModel((m) => ({ ...m, status: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4 space-y-1">
              <div className="text-xs font-medium">Remarks</div>
              <Textarea
                value={editModel.remarks}
                onChange={(e) => setEditModel((m) => ({ ...m, remarks: e.target.value }))}
                rows={3}
                placeholder="Notes, context, etc."
              />
            </div>
          </div>
        ) : null}

        {/* User strip */}
        <div className="mt-4 rounded-md border p-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div><span className="font-semibold">Name:</span> {user.fullName || "-"}</div>
          <div><span className="font-semibold">Employee ID:</span> {user.employeeId ?? "-"}</div>
          <div><span className="font-semibold">Email:</span> {user.email || "-"}</div>
          <div><span className="font-semibold">Department:</span> {user.department || "-"}</div>
          <div><span className="font-semibold">Designation:</span> {user.designation || "-"}</div>
          <div><span className="font-semibold">Branch/City:</span> {user.branch ? `${user.branch}${user.city ? `, ${user.city}` : ""}` : (user.city || "-")}</div>
        </div>

        <Separator className="my-6" />

        {/* Table */}
        <div className="rounded-md border overflow-x-auto md:overflow-visible" data-pdf-scroll>
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-center font-semibold">Sr No</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="w-24 text-right font-semibold">KM</TableHead>
                <TableHead className="w-24 text-right font-semibold">Rate</TableHead>
                <TableHead className="w-28 text-right font-semibold">Amount</TableHead>
                {adminMode ? (
                  <TableHead className="w-32 text-right font-semibold">Verification</TableHead>
                ) : (
                  <TableHead className="w-28 text-right font-semibold">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r, i) => {
                const km = Number(r.km) || 0;
                const rate = Number(r.rate) || 0;
                const amount = Number.isFinite(r.amount) ? r.amount : km * rate;
                const dateStr = fmtDate(r.date);
                const srNo = r.srNo ?? i + 1;
                const isVerified = Boolean(r.verified);
                const toggleDisabled = verifyingSrNo === srNo;

                return (
                  <TableRow key={`${srNo}-${i}`} className={isVerified ? "bg-green-100/35" : "bg-amber-100/20"}>
                    <TableCell className="text-center">{srNo}</TableCell>
                    <TableCell className="whitespace-pre-wrap">
                      {dateStr ? (
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {dateStr}
                        </div>
                      ) : null}
                      {r.description}
                    </TableCell>
                    <TableCell className="text-right">{km}</TableCell>
                    <TableCell className="text-right">{rate}</TableCell>
                    <TableCell className="text-right">{amount}</TableCell>

                    {adminMode ? (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isVerified ? "secondary" : "outline"}
                          onClick={() => onToggleVerification?.(srNo, !isVerified)}
                          disabled={toggleDisabled}
                        >
                          {toggleDisabled ? "Saving..." : isVerified ? "Unverify" : "Verify"}
                        </Button>
                      </TableCell>
                    ) : (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeLineItem(srNo)}
                          disabled={removingSrNo === srNo}
                        >
                          {removingSrNo === srNo ? "Removing…" : "Remove"}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}

              {/* Totals row */}
              <TableRow className="bg-muted/40">
                <TableCell />
                <TableCell className="font-semibold text-right">
                  {adminMode ? "Verified Totals" : "Totals"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {adminMode ? totals.verifiedKm : totals.km}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold">
                  {adminMode ? totals.verifiedAmount : totals.amount}
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground font-medium">
                  {adminMode ? `${verifiedCount}/${items.length} verified` : ""}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {adminMode ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Only verified line items are counted toward the totals.
          </p>
        ) : null}

        {/* Remarks + status */}
        <div className="mt-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
          <div><span className="font-semibold">Status:</span> {doc.status}</div>
          <div><span className="font-semibold">Created:</span> {new Date(doc.createdAt).toLocaleString()}</div>
          {doc.remarks ? (
            <div className="md:col-span-2"><span className="font-semibold">Remarks:</span> {doc.remarks}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
