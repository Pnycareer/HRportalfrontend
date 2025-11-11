import React from "react";
import PrivateRoute from "./PrivateRoute";
import { paths } from "../constants/paths";

import AdminLayout from "@/layouts/AdminLayout"; // EAGER (no lazy)
import UserMonthlyReport from "@/pages/reports/UserMonthlyReport";
import SalarySheetPage from "@/pages/admin/SalarySheet";
import SalarySheetViewerPage from "@/pages/admin/SalarySheetViewer";

const AllEmployees = React.lazy(() => import("@/pages/admin/AllEmployees"));
const MarkAttendance = React.lazy(() => import("@/pages/admin/MarkAttendance"));
const MonthlyBranchReport = React.lazy(() =>
  import("@/pages/reports/MonthlyBranchReport")
);
const MonthlyOvertimeReport = React.lazy(() =>
  import("@/pages/reports/MonthlyOvertimeReport")
);
const LeaveApprovals = React.lazy(() => import("@/pages/admin/LeaveApprovals"));
const LeaveReports = React.lazy(() => import("@/pages/admin/LeaveReports"));
const InstructorOvertime = React.lazy(() =>
  import("@/pages/admin/InstructorOvertime")
);
const FuelRequisitionReport = React.lazy(() =>
  import("@/pages/admin/FuelRequisitionReport")
);

const adminRoutes = [
  {
    element: <PrivateRoute allowedRoles={["superadmin", "hr"]} />,
    children: [
      {
        element: <AdminLayout />, // not lazy, removes the waterfall
        children: [
          { index: true, element: <h1>ADMIN</h1> },
          { path: paths.USERS, element: <AllEmployees /> },
          { path: paths.MARK_ATTENDANCE, element: <MarkAttendance /> },
          { path: paths.LEAVE_REQUESTS, element: <LeaveApprovals /> },
          { path: "leave-report", element: <LeaveReports /> },
          { path: "monthly-report", element: <MonthlyBranchReport /> },
          { path: "user-monthly", element: <UserMonthlyReport /> },
          {
            path: paths.MONTHLY_OVERTIME_REPORT,
            element: <MonthlyOvertimeReport />,
          },
          { path: paths.INSTRUCTOR_OVERTIME, element: <InstructorOvertime /> },
          {
            path: "fuel-requisition-report",
            element: <FuelRequisitionReport />,
          },
          { path: paths.SALARY_SHEET, element: <SalarySheetPage /> },
          { path: paths.SALARY_SHEET_VIEWER, element: <SalarySheetViewerPage /> },
       ],
     },
    ],
  },
];

export default adminRoutes;
