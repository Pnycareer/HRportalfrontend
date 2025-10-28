import React, { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { paths } from "../constants/paths";
import authRoutes from "./authRoutes";
import adminRoutes from "./adminRoutes";
import employeeRoutes from "./employeeRoutes";

const App = lazy(() => import("../../App"));

const withSuspense = (node) => (
  <Suspense fallback={<div className="p-6">Loading…</div>}>{node}</Suspense>
);

const router = createBrowserRouter([
  {
    path: paths.HOME,
    element: withSuspense(<App />),
    children: [...authRoutes],
  },
  {
    path: "/admin",
    children: [...adminRoutes],
  },
  {
    path: "/employee",
    children: [...employeeRoutes],
  },
  {
    path: "/access-denied",
    element: <h1>Access Denied</h1>,
  },
]);

export default router;
