// src/routes/adminRoutes.jsx
import AdminLayout from "@/layouts/AdminLayout";
import PrivateRoute from "./PrivateRoute";
import { paths } from "../constants/paths";
import AllEmployees from "@/pages/admin/AllEmployees";
import MarkAttendance from "@/pages/admin/MarkAttendance";
import MonthlyBranchReport from "@/pages/reports/MonthlyBranchReport";
import MonthlyOvertimeReport from "@/pages/reports/MonthlyOvertimeReport";
import LeaveApprovals from "@/pages/admin/LeaveApprovals";
import LeaveReports from "@/pages/admin/LeaveReports";
import InstructorOvertime from "@/pages/admin/InstructorOvertime";
import FuelRequisitionReport from "@/pages/admin/FuelRequisitionReport";

const adminRoutes = [
  {
    // admin-only gate
    element: <PrivateRoute allowedRoles={["superadmin", "hr"]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <h1>ADMIN</h1> },
          { path: paths.USERS, element: <AllEmployees /> },
          { path: paths.MARK_ATTENDANCE, element: <MarkAttendance /> },
          { path: paths.LEAVE_REQUESTS, element: <LeaveApprovals /> },
          { path: "leave-report", element: <LeaveReports /> },
          { path: "monthly-report", element: <MonthlyBranchReport /> },
          { path: paths.MONTHLY_OVERTIME_REPORT,element: <MonthlyOvertimeReport />},
          { path: paths.INSTRUCTOR_OVERTIME, element: <InstructorOvertime /> },
          { path: "fuel-requisition-report", element: <FuelRequisitionReport/> },
        ],
      },
    ],
  },
];

export default adminRoutes;
