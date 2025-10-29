import React, { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { paths } from "../constants/paths";
import authRoutes from "./authRoutes";
import adminRoutes from "./adminRoutes";
import employeeRoutes from "./employeeRoutes";
import Spinner from "../Spinner/Spinner";

const App = lazy(() => import("../../App"));

const router = createBrowserRouter([
  {
    path: paths.HOME,
    element: (
      <Suspense fallback={<Spinner label="Loading page…" />}>
        <App />
      </Suspense>
    ),
    children: [...authRoutes],
  },


  { path: "/admin", children: [...adminRoutes] },
  { path: "/employee", children: [...employeeRoutes] },
  { path: "/access-denied", element: <h1>Access Denied</h1> },
]);

export default router;
