import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useInstructorOvertime } from "@/hooks/useInstructorOvertime";
import { CITY_BRANCHES } from "@/constants/branches";
import { makeInitialSlot, minutesToHuman, toMinutes } from "@/utils/time";
import OvertimeForm from "@/components/Instructorovertime/employee/OvertimeForm";
import ClaimsTable from "@/components/Instructorovertime/employee/ClaimsTable";

export default function InstructorOvertime() {
  const { user } = useAuth();
  const { claims, loading, saving, fetchClaims, createClaim, updateClaim, deleteClaim } =
    useInstructorOvertime();

  const [form, setForm] = React.useState(() => {
    const today = new Date();
    const defaultDate = today.toISOString().slice(0, 10);
    return { date: defaultDate, city: "", branchName: "", notes: "" };
  });

  const [slots, setSlots] = React.useState(() => [makeInitialSlot()]);

  React.useEffect(() => {
    fetchClaims().catch(() => {});
  }, [fetchClaims]);

  // Reset branch if it no longer exists for the picked city (create form)
  React.useEffect(() => {
    if (!form.city) return;
    const allowed = CITY_BRANCHES[form.city] || [];
    if (!allowed.includes(form.branchName)) {
      setForm((prev) => ({ ...prev, branchName: "" }));
    }
  }, [form.city, form.branchName]);

  const totalMinutes = React.useMemo(() => {
    return slots.reduce((sum, slot) => {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      if (start === null || end === null || end <= start) return sum;
      return sum + (end - start);
    }, 0);
  }, [slots]);

  const handleFormChange = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlotChange = (slotId, field, value) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === slotId ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlot = () => setSlots((prev) => [...prev, makeInitialSlot()]);
  const handleRemoveSlot = (slotId) =>
    setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((slot) => slot.id !== slotId)));

  const handleCreate = async (payload) => {
    await createClaim(payload);
    setSlots([makeInitialSlot()]);
    setForm((prev) => ({ ...prev, notes: "" }));
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Instructor Overtime</h1>
        <p className="text-sm text-muted-foreground">
          Submit overtime claims and keep track of what has been reviewed by HR.
        </p>
      </header>

      <OvertimeForm
        form={form}
        onChangeField={handleFormChange}
        slots={slots}
        onChangeSlot={handleSlotChange}
        onAddSlot={handleAddSlot}
        onRemoveSlot={handleRemoveSlot}
        totalMinutes={totalMinutes}
        onSubmit={handleCreate}
        saving={saving}
        cityBranches={CITY_BRANCHES}
      />

      <ClaimsTable
        claims={claims}
        loading={loading}
        saving={saving}
        cityBranches={CITY_BRANCHES}
        onUpdate={updateClaim}
        onDelete={deleteClaim}
      />
    </div>
  );
}
