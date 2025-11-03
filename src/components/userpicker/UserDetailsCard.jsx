import React, { useMemo } from "react";

function DetailItem({ label, value }) {
  const hasValue =
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "");

  if (!hasValue) return null;

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/50 bg-background px-3 py-2 shadow-sm transition hover:border-primary/60 hover:shadow-md">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground/90 break-words">
        {String(value)}
      </span>
    </div>
  );
}

function StatusBadge({ tone = "default", children }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "warning"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-muted text-muted-foreground border-border/70";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}

export default function UserDetailsCard({ user }) {
  if (!user) return null;

  const offDays = Array.isArray(user.officialOffDays)
    ? user.officialOffDays.join(", ")
    : user.officialOffDays;

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

const formatCurrency = (amount) =>
  amount === undefined || amount === null || amount === ""
    ? ""
    : new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        currencyDisplay: "symbol",
      }).format(amount);


  const initials = useMemo(() => {
    if (!user.fullName) return "";

    return user.fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user.fullName]);

  const designation = user.designation || "N/A";
  const department = user.department || "N/A";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-xl">
      <div className="relative bg-gradient-to-br from-primary/20 via-white to-white px-6 pt-6 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary shadow-inner ring-1 ring-primary/20">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.fullName || "user"}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || user?.fullName?.[0]?.toUpperCase() || "?"
              )}
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                {user.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {designation} - {department}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={user.isApproved ? "success" : "warning"}>
              {user.isApproved ? "Approved" : "Pending"}
            </StatusBadge>
            {user.isTeamLead && <StatusBadge>Team Lead</StatusBadge>}
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-background px-6 pb-6 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Profile
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Employee ID" value={user.employeeId} />
              <DetailItem label="Email" value={user.email} />
              <DetailItem label="Role" value={user.role} />
              <DetailItem
                label="Joining Date"
                value={formatDate(user.joiningDate)}
              />
              <DetailItem label="Duty Roster" value={user.dutyRoster} />
              <DetailItem label="Official Off Days" value={offDays} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Location & Contact
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Branch" value={user.branch} />
              <DetailItem label="City" value={user.city} />
              <DetailItem label="Contact Number" value={user.contactNumber} />
              <DetailItem label="Blood Group" value={user.bloodGroup} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Compensation & Bank
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Salary" value={formatCurrency(user.salary)} />
              <DetailItem label="Bank Account No" value={user.bankAccountNo} />
              <DetailItem
                label="Bank Account Title"
                value={user.bankAccountTitle}
              />
              <DetailItem
                label="Bank Branch Code"
                value={user.bankBranchCode}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
