import { createBrowserRouter } from "react-router-dom";
import App from "../../App";
import { paths } from "../constants/paths";
import authRoutes from "./authRoutes";
import adminRoutes from "./adminRoutes";
import employeeRoutes from "./employeeRoutes";

const router = createBrowserRouter([
  {
    path: paths.HOME,
    element: <App />,
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
