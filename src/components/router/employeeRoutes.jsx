import React from "react";
import PrivateRoute from "./PrivateRoute";

import EmployeeLayout from "@/layouts/EmployeeLayout"; // EAGER

const MyAttendance = React.lazy(() => import("@/pages/employee/MyAttendance"));
const LeaveRequests = React.lazy(() => import("@/pages/employee/LeaveRequests"));
const TeamLeadApprovals = React.lazy(() => import("@/pages/employee/TeamLeadApprovals"));
const LeaveReports = React.lazy(() => import("@/pages/employee/LeaveReports"));
const UserMonthlyReport = React.lazy(() => import("@/pages/reports/UserMonthlyReport"));
const ProfileCard = React.lazy(() => import("@/pages/employee/ProfileCard"));
const InstructorOvertime = React.lazy(() => import("@/pages/employee/InstructorOvertime"));
const FuelRequistion = React.lazy(() => import("@/pages/Fuel/FuelRequistion"));

const employeeRoutes = [
  {
    element: <PrivateRoute allowedRoles={["employee", "superadmin"]} />,
    children: [
      {
        element: <EmployeeLayout />, // not lazy, removes the waterfall
        children: [
          { index: true, element: <MyAttendance /> },
          { path: "leaves", element: <LeaveRequests /> },
          { path: "team-lead/review", element: <TeamLeadApprovals /> },
          { path: "leave-report", element: <LeaveReports /> },
          { path: "employee-card", element: <ProfileCard /> },
          { path: "instructor-overtime", element: <InstructorOvertime /> },
          { path: "fuel-requisition", element: <FuelRequistion /> },
        ],
      },
    ],
  },
];

export default employeeRoutes;
