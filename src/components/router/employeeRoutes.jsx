// src/routes/adminRoutes.jsx
import AdminLayout from "@/layouts/AdminLayout";
import PrivateRoute from "./PrivateRoute";
import { paths } from "../constants/paths";
import AllEmployees from "@/pages/admin/AllEmployees";
import MarkAttendance from "@/pages/admin/MarkAttendance";
import EmployeeLayout from "@/layouts/EmployeeLayout";
import MyAttendance from "@/pages/employee/MyAttendance";
import LeaveRequests from "@/pages/employee/LeaveRequests";
import TeamLeadApprovals from "@/pages/employee/TeamLeadApprovals";
import LeaveReports from "@/pages/employee/LeaveReports";
import UserMonthlyReport from "@/pages/reports/UserMonthlyReport";
import ProfileCard from "@/pages/employee/ProfileCard";

const employeeRoutes = [
  {
    element: <PrivateRoute allowedRoles={["employee" , "superadmin"]} />,
    children: [
      {
        element: <EmployeeLayout />,
        children: [
          { index: true, element: <MyAttendance /> },
          { path: "leaves", element: <LeaveRequests /> },
          { path: "team-lead/review", element: <TeamLeadApprovals /> },
          { path: "leave-report", element: <LeaveReports /> },
          { path: "user-monthly", element: <UserMonthlyReport/> },
          { path: "employee-card", element: <ProfileCard/> },
        ],
      },
    ],
  },
];

export default employeeRoutes;
