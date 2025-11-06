export function acceptedFormsFileName(user, period, suffix = "accepted-forms") {
  const employeeId = user?.employeeId || "employee";
  const month =
    period?.month !== undefined ? String(period.month).padStart(2, "0") : "";
  const year = period?.year ?? "";
  const periodLabel = month && year ? `${month}-${year}` : `${month}${year}` || "period";
  return `${employeeId}-${periodLabel}-${suffix}.pdf`;
}