import React, { useMemo, useState } from "react";
import api from "@/lib/axios";
import FuelRequisitionList from "@/components/fuel/FuelRequisitionList";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const defaultRate = 11;
const emptyRow = (i) => ({ srNo: i + 1, description: "", km: "", rate: defaultRate, date: "" });
const parseDateValue = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    date: dt,
    monthName: MONTHS[dt.getMonth()],
    year: dt.getFullYear(),
  };
};

export default function FuelRequisition() {
  const now = new Date();

  const [submitting, setSubmitting] = useState(false);
  const [autoAmount, setAutoAmount] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    month: MONTHS[now.getMonth()],
    year: now.getFullYear(),
    status: "draft",
    remarks: "",
    items: [emptyRow(0)],
  });

  const totals = useMemo(() => {
    const totalKm = form.items.reduce((s, r) => s + (Number(r.km) || 0), 0);
    const totalAmount = form.items.reduce((s, r) => {
      const km = Number(r.km) || 0;
      const rate = Number(r.rate) || 0;
      let amount = Number(r.amount);
      if (autoAmount || !Number.isFinite(amount)) amount = km * rate;
      return s + amount;
    }, 0);
    return { totalKm, totalAmount };
  }, [form.items, autoAmount]);

  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateRow = (i, k, v) =>
    setForm((f) => {
      const items = f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it));
      items.forEach((it, idx) => (it.srNo = idx + 1));
      return { ...f, items };
    });
  const handleDateChange = (i, value) => {
    updateRow(i, "date", value);
    const parsed = parseDateValue(value);
    if (!parsed) return;
    const selectedYear = Number(form.year) || now.getFullYear();
    if (parsed.monthName !== form.month || parsed.year !== selectedYear) {
      toast.warning("Line item uses a different month", {
        description: `Row ${i + 1} is dated ${parsed.monthName} ${parsed.year}. Update the Month/Year at the top or adjust the date.`,
      });
    }
  };
  const addRow = () => setForm((f) => ({ ...f, items: [...f.items, emptyRow(f.items.length)] }));
  const removeRow = (idx) =>
    setForm((f) => {
      const items = f.items.filter((_, i) => i !== idx);
      items.forEach((it, i) => (it.srNo = i + 1));
      return { ...f, items: items.length ? items : [emptyRow(0)] };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedMonth = form.month;
    const selectedYear = Number(form.year) || now.getFullYear();
    const mismatched = form.items
      .map((row, idx) => ({ row, idx, parsed: parseDateValue(row.date) }))
      .filter(({ parsed }) => parsed && (parsed.monthName !== selectedMonth || parsed.year !== selectedYear));
    if (mismatched.length) {
      const { row, idx, parsed } = mismatched[0];
      toast.error("Date does not match selected month", {
        description: `Line ${row?.srNo ?? idx + 1} is dated ${parsed.monthName} ${parsed.year}. Please update the Month/Year or change the line item's date before submitting.`,
      });
      return;
    }

    const payload = {
      month: selectedMonth,
      year: selectedYear,
      status: form.status,
      remarks: form.remarks?.trim(),
      items: form.items.map((r) => {
        const km = Number(r.km) || 0;
        const rate = Number(r.rate) || 0;
        const base = { srNo: Number(r.srNo), description: r.description?.trim(), km, rate };
        const maybeDate = r.date ? { date: new Date(r.date) } : {};
        if (!autoAmount) base.amount = Number(r.amount) || 0;
        return { ...base, ...maybeDate };
      }),
    };

    try {
      setSubmitting(true);
      await api.post("/api/fuel-requisitions", payload);
      toast.success("Requisition submitted.", {
        description: "Your fuel requisition has been saved.",
      });
      setForm((f) => ({ ...f, status: "submitted", remarks: "", items: [emptyRow(0)] }));
      setRefreshKey((k) => k + 1); // refresh list
    } catch (err) {
      toast.error("Failed to save requisition", {
        description: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-2xl font-semibold">Fuel Requisition</CardTitle>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="space-y-1">
              <Label>Month</Label>
              <Select value={form.month} onValueChange={(v) => updateField("month", v)}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {MONTHS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => updateField("year", e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {["submitted" ,"draft"].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-base">Line Items</Label>
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={autoAmount} onCheckedChange={setAutoAmount} id="auto-amount" />
                <Label htmlFor="auto-amount" className="cursor-pointer">Auto-calc amounts</Label>
              </div>
            </div>
            <Button size="sm" type="button" onClick={addRow}>Add Row</Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Sr #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-24">KM</TableHead>
                  <TableHead className="w-24">Rate</TableHead>
                  <TableHead className="w-28">Amount</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.map((row, idx) => {
                  const km = Number(row.km) || 0;
                  const rate = Number(row.rate) || 0;
                  const computedAmount = km * rate;

                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-center">{row.srNo}</TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Visit Details"
                          value={row.description}
                          onChange={(e) => updateRow(idx, "description", e.target.value)}
                          className="min-h-[44px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={row.date} onChange={(e) => handleDateChange(idx, e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.km} onChange={(e) => updateRow(idx, "km", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min="0" value={row.rate} onChange={(e) => updateRow(idx, "rate", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={autoAmount ? computedAmount : (row.amount || "")}
                          onChange={(e) => updateRow(idx, "amount", e.target.value)}
                          disabled={autoAmount}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" type="button" onClick={() => removeRow(idx)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => updateField("remarks", e.target.value)} placeholder="Anything for the approver?" />
            </div>
            <div className="flex flex-col gap-3 justify-end">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total KM</span><span>{totals.totalKm}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold">Total Amount</span><span className="font-semibold">{totals.totalAmount}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Submit Requisition"}
          </Button>
        </CardFooter>
      </Card>

      {/* Always show this user's requisitions; auto-refresh after submit */}
      <FuelRequisitionList month={form.month} year={form.year} refreshKey={refreshKey} />
    </div>
  );
}
