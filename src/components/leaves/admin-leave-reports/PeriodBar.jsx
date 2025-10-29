import React from "react";
import { Button } from "@/components/ui/button";
import { SelectItem } from "@/components/ui/select";
import { months } from "@/components/constants/leavereport";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";

function PeriodBar({
  year, setYear,
  month, setMonth,
  activeTab, setActiveTab,
  loading, loadingEmployees,
  onRefresh, onDownload,
  monthly, yearly,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="w-32">
        <InputField
          id="year"
          name="year"
          label="Year"
          type="number"
          min="2000"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>

      <div className="w-40">
        <SelectField
          label="Month"
          name="month"
          value={month}
          onValueChange={setMonth}
          placeholder="Select month"
        >
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectField>
      </div>

      <Button onClick={onRefresh} disabled={loading || loadingEmployees}>
        {loading ? "Loading..." : "Refresh"}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === "monthly" ? "default" : "outline"}
          onClick={() => setActiveTab("monthly")}
        >
          Monthly report
        </Button>
        <Button
          variant={activeTab === "yearly" ? "default" : "outline"}
          onClick={() => setActiveTab("yearly")}
        >
          Yearly summary
        </Button>
        <Button
          variant="outline"
          onClick={onDownload}
          disabled={loading || (!monthly && !yearly)}
        >
          Download PDF
        </Button>
      </div>
    </div>
  );
}

export default React.memo(PeriodBar);
