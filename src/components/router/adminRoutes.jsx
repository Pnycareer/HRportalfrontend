import React, { lazy, Suspense } from "react";
import PrivateRoute from "./PrivateRoute";
import { paths } from "../constants/paths";

const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AllEmployees = lazy(() => import("@/pages/admin/AllEmployees"));
const MarkAttendance = lazy(() => import("@/pages/admin/MarkAttendance"));
const MonthlyBranchReport = lazy(() => import("@/pages/reports/MonthlyBranchReport"));
const MonthlyOvertimeReport = lazy(() => import("@/pages/reports/MonthlyOvertimeReport"));
const LeaveApprovals = lazy(() => import("@/pages/admin/LeaveApprovals"));
const LeaveReports = lazy(() => import("@/pages/admin/LeaveReports"));
const InstructorOvertime = lazy(() => import("@/pages/admin/InstructorOvertime"));
const FuelRequisitionReport = lazy(() => import("@/pages/admin/FuelRequisitionReport"));

const wrap = (el) => <Suspense fallback={null}>{el}</Suspense>;

const adminRoutes = [
  {
    element: <PrivateRoute allowedRoles={["superadmin", "hr"]} />,
    children: [
      {
        element: wrap(<AdminLayout />),
        children: [
          { index: true, element: <h1>ADMIN</h1> },
          { path: paths.USERS, element: wrap(<AllEmployees />) },
          { path: paths.MARK_ATTENDANCE, element: wrap(<MarkAttendance />) },
          { path: paths.LEAVE_REQUESTS, element: wrap(<LeaveApprovals />) },
          { path: "leave-report", element: wrap(<LeaveReports />) },
          { path: "monthly-report", element: wrap(<MonthlyBranchReport />) },
          { path: paths.MONTHLY_OVERTIME_REPORT, element: wrap(<MonthlyOvertimeReport />) },
          { path: paths.INSTRUCTOR_OVERTIME, element: wrap(<InstructorOvertime />) },
          { path: "fuel-requisition-report", element: wrap(<FuelRequisitionReport />) },
        ],
      },
    ],
  },
];

export default adminRoutes;
