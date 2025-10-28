import React, { lazy, Suspense } from "react";

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));

const wrap = (el) => <Suspense fallback={null}>{el}</Suspense>;

const authRoutes = [
  { index: true, element: wrap(<Login />) },
  { path: "/register", element: wrap(<Register />) },
  {
    // element: <PrivateRoute />,
    children: [],
  },
];

export default authRoutes;
