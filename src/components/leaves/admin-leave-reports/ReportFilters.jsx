import React from "react";
import { SelectItem } from "@/components/ui/select";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";

function ReportFilters({
  branch, setBranch, branches = [],
  dept, setDept, departments = [],
  q, setQ,
  employees = [],
  selectedUserId, setSelectedUserId,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <SelectField
          label="Branch"
          name="branch"
          value={branch}
          onValueChange={setBranch}
          placeholder="Branch"
        >
          {branches.map((item) => (
            <SelectItem key={item} value={item}>
              {item === "all" ? "All branches" : item}
            </SelectItem>
          ))}
        </SelectField>
      </div>

      <div className="w-48">
        <SelectField
          label="Department"
          name="dept"
          value={dept}
          onValueChange={setDept}
          placeholder="Department"
        >
          {departments.map((item) => (
            <SelectItem key={item} value={item}>
              {item === "all" ? "All departments" : item}
            </SelectItem>
          ))}
        </SelectField>
      </div>

      <div className="w-56">
        <InputField
          id="search"
          name="search"
          label="Search"
          placeholder="Name, email, ID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="w-64">
        <SelectField
          label="Employee"
          name="employee"
          value={selectedUserId || undefined}
          onValueChange={setSelectedUserId}
          placeholder="Select employee"
        >
          {employees.map((emp) => (
            <SelectItem key={emp._id} value={emp._id}>
              {emp.fullName} ({emp.employeeId})
            </SelectItem>
          ))}
        </SelectField>
      </div>
    </div>
  );
}

export default React.memo(ReportFilters);
