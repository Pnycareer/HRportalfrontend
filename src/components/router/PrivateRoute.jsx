// src/routes/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function routeForRole(role) {
  if (role === "employee") return "/employee";
  if (role === "admin" || role === "superadmin" || role === "hr")
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
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={routeForRole(user.role)} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
