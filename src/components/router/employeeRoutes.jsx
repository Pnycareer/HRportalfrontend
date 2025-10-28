import React, { lazy, Suspense } from "react";
import PrivateRoute from "./PrivateRoute";

const EmployeeLayout = lazy(() => import("@/layouts/EmployeeLayout"));
const MyAttendance = lazy(() => import("@/pages/employee/MyAttendance"));
const LeaveRequests = lazy(() => import("@/pages/employee/LeaveRequests"));
const TeamLeadApprovals = lazy(() => import("@/pages/employee/TeamLeadApprovals"));
const LeaveReports = lazy(() => import("@/pages/employee/LeaveReports"));
const UserMonthlyReport = lazy(() => import("@/pages/reports/UserMonthlyReport"));
const ProfileCard = lazy(() => import("@/pages/employee/ProfileCard"));
const InstructorOvertime = lazy(() => import("@/pages/employee/InstructorOvertime"));
const FuelRequistion = lazy(() => import("@/pages/Fuel/FuelRequistion"));

const wrap = (el) => <Suspense fallback={null}>{el}</Suspense>;

const employeeRoutes = [
  {
    element: <PrivateRoute allowedRoles={["employee", "superadmin"]} />,
    children: [
      {
        element: wrap(<EmployeeLayout />),
        children: [
          { index: true, element: wrap(<MyAttendance />) },
          { path: "leaves", element: wrap(<LeaveRequests />) },
          { path: "team-lead/review", element: wrap(<TeamLeadApprovals />) },
          { path: "leave-report", element: wrap(<LeaveReports />) },
          { path: "user-monthly", element: wrap(<UserMonthlyReport />) },
          { path: "employee-card", element: wrap(<ProfileCard />) },
          { path: "instructor-overtime", element: wrap(<InstructorOvertime />) },
          { path: "fuel-requisition", element: wrap(<FuelRequistion />) },
        ],
      },
    ],
  },
];

export default employeeRoutes;
