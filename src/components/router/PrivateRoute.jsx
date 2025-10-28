// src/routes/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function routeForRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "employee") return "/employee";
  if (value === "admin" || value === "superadmin" || value === "hr")
    return "/admin";
  return "/";
}

const PrivateRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // not logged in -> hard redirect to /login (no remembering)
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // logged in but not allowed -> send to their area
  const activeRole = user.activeRole || user.role;

  if (allowedRoles.length && !allowedRoles.includes(activeRole)) {
    return <Navigate to={routeForRole(activeRole)} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
