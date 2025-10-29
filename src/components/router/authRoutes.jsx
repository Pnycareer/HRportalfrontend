import React from "react";

// First paint routes should be eager
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

const authRoutes = [
  { index: true, element: <Login /> },
  { path: "/register", element: <Register /> },
];

export default authRoutes;
