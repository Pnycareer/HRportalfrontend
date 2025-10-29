import React from "react";
import { Button } from "@/components/ui/button";
import InputField from "@/components/form/InputField";

function AllowanceOverride({
  monthly, yearly,
  allowanceDraft, setAllowanceDraft,
  allowanceDirty, setAllowanceDirty,
  savingAllowance, selectedUserId,
  onSave, onReset,
}) {
  const approvedAuto =
    allowanceDraft.allowed && allowanceDraft.remaining
      ? Math.max(
          Number(allowanceDraft.allowed || 0) -
            Number(allowanceDraft.remaining || 0),
          0
        )
      : monthly?.allowance?.used ?? "";

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setAllowanceDraft((prev) => ({ ...prev, [field]: value }));
    setAllowanceDirty(true);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold">Allowance override</h2>
        <p className="text-sm text-muted-foreground">
          Update annual allowance and remaining balance for the selected employee.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <InputField
          id="annual-allowance"
          name="annual-allowance"
          label="Annual allowance"
          type="number"
          min="0"
          value={allowanceDraft.allowed}
          onChange={handleChange("allowed")}
          disabled={savingAllowance || !selectedUserId}
          required
        />

        <InputField
          id="remaining-balance"
          name="remaining-balance"
          label="Remaining balance"
          type="number"
          min="0"
          value={allowanceDraft.remaining}
          onChange={handleChange("remaining")}
          disabled={savingAllowance || !selectedUserId}
          required
        />

        <InputField
          id="approved-days"
          name="approved-days"
          label="Approved days (auto)"
          value={approvedAuto}
          readOnly
          description="Calculated as allowed − remaining"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onSave}
          disabled={
            savingAllowance ||
            !selectedUserId ||
            !allowanceDirty ||
            allowanceDraft.allowed === "" ||
            allowanceDraft.remaining === ""
          }
        >
          {savingAllowance ? "Saving..." : "Save allowance"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          disabled={savingAllowance || !allowanceDirty}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export default React.memo(AllowanceOverride);
