// src/pages/Fuel/FuelRequisitionList.jsx
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import FuelRequisitionView from "@/pages/Fuel/FuelRequisitionView";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function FuelRequisitionList({ month, year, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function fetchData() {
    try {
      setLoading(true);
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const res = await api.get("/api/fuel-requisitions", { params });
      setRows(res.data?.data || []);
      // toast.success("Requisitions loaded successfully");
    } catch (e) {
      const msg = e.message || "Failed to load requisitions";
      setErr(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (ignore) return;
      await fetchData();
    })();
    return () => {
      ignore = true;
    };
  }, [month, year, refreshKey]);

  const handleDeleted = (id) => {
    setRows((prev) => prev.filter((r) => String(r._id) !== String(id)));
    toast.success("Requisition deleted");
  };

  const handleUpdated = (updated) => {
    setRows((prev) =>
      prev.map((r) => (String(r._id) === String(updated._id) ? updated : r))
    );
    toast.success("Requisition updated");
  };

  if (loading)
    return (
      <div className="mt-6 text-sm text-muted-foreground">
        loading your requisitions…
      </div>
    );

  if (err)
    return <div className="mt-6 text-sm text-red-600">{err}</div>;

  if (!rows.length) {
    return (
      <Card className="mt-8">
        <CardContent className="p-6 text-sm text-muted-foreground">
          no requisitions found for {month ? `${month} ` : ""}
          {year || ""}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6">
      {rows.map((doc) => (
        <FuelRequisitionView
          key={doc._id}
          data={doc}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      ))}
    </div>
  );
}
